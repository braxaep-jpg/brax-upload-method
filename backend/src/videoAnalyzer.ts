import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

// Prefer explicit deployment paths; otherwise let fluent-ffmpeg resolve binaries from PATH.
const configuredFfmpeg = process.env.FFMPEG_PATH;
const configuredFfprobe = process.env.FFPROBE_PATH;
try {
  if (configuredFfmpeg) {
    ffmpeg.setFfmpegPath(configuredFfmpeg);
  }
  if (configuredFfprobe) {
    ffmpeg.setFfprobePath(configuredFfprobe);
  }
} catch (e) {
  // ignore; fluent-ffmpeg will fallback to searching PATH
}

type FFProbeStream = {
  codec_type?: string;
  width?: number;
  height?: number;
  codec_name?: string;
  avg_frame_rate?: string;
  color_space?: string;
  profile?: string;
};

type FFProbeFormat = {
  format_name?: string;
  bit_rate?: string;
  duration?: string;
};

type FFProbeData = {
  streams?: FFProbeStream[];
  format?: FFProbeFormat;
};

export interface VideoAnalysisResult {
  format: string;
  codec: string;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  duration: number;
  colorSpace: string | null;
  profile: string | null;
  issues: string[];
  recommended: {
    resolution: string;
    fps: number;
    codec: string;
    bitrate: number;
    colorSpace: string;
  };
}

const parseFps = (frameRate?: string): number => {
  if (!frameRate) {
    return 0;
  }

  if (frameRate.includes('/')) {
    const [num, den] = frameRate.split('/').map(Number);
    return den !== 0 ? num / den : 0;
  }

  return Number(frameRate);
};

const recommendResolution = (width: number, height: number) => {
  if (width >= 1920 || height >= 1920) {
    return '1080p (максимум 1080x1920)';
  }
  return `${width}x${height}`;
};

const recommendFps = (fps: number) => {
  if (fps === 0) {
    return 30;
  }
  if (fps > 60) {
    return 60;
  }
  return fps;
};

const recommendBitrate = (width: number, height: number) => {
  const maxSide = Math.max(width, height);
  if (maxSide >= 2160) {
    return 40000000;
  }
  if (maxSide >= 1440) {
    return 25000000;
  }
  return 12000000;
};

const getBestVideoEncoder = (encoders: Record<string, any>) => {
  const preferred = ['libx264', 'h264_nvenc', 'h264_qsv', 'h264_amf', 'h264_mf', 'mpeg4'];
  for (const name of preferred) {
    if (encoders[name]) {
      return name;
    }
  }
  return 'mpeg4';
};

const buildIssues = (stream: FFProbeStream, width: number, height: number, bitrate: number, fps: number) => {
  const issues: string[] = [];

  if (stream.codec_name && !['h264', 'hevc', 'h265'].includes(stream.codec_name)) {
    issues.push(`Кодек ${stream.codec_name} может быть рекодирован в H.264/H.265`);
  }

  if (bitrate > 0 && bitrate < recommendBitrate(width, height)) {
    issues.push('Низкий битрейт — возможна сильная компрессия');
  }

  if (width > 1080 || height > 1920) {
    issues.push('Видео превышает рекомендованное разрешение для TikTok');
  }

  if (fps > 60) {
    issues.push('Частота кадров выше 60 fps, TikTok может понизить FPS');
  }

  if (stream.color_space && stream.color_space !== 'bt709') {
    issues.push('Цветовое пространство не BT.709 — возможны проблемы при трансляции');
  }

  return issues;
};

const clampFps = (fps: number) => Math.min(60, Math.max(24, Math.round(fps || 30)));

const resolveTargetDimensions = (width: number, height: number) => {
  const maxLongSide = 1920;
  const maxShortSide = 1080;
  const isPortrait = height > width;
  const longSide = isPortrait ? height : width;
  const shortSide = isPortrait ? width : height;
  const scale = longSide > maxLongSide ? maxLongSide / longSide : 1;
  const targetWidth = Math.max(720, Math.round(width * scale));
  const targetHeight = Math.max(720, Math.round(height * scale));

  if (isPortrait && targetHeight > maxShortSide) {
    const portraitScale = maxShortSide / targetHeight;
    return {
      width: Math.max(720, Math.round(targetWidth * portraitScale)),
      height: maxShortSide
    };
  }

  if (!isPortrait && targetWidth > maxLongSide) {
    const landscapeScale = maxLongSide / targetWidth;
    return {
      width: maxLongSide,
      height: Math.max(720, Math.round(targetHeight * landscapeScale))
    };
  }

  return {
    width: Math.min(width, targetWidth),
    height: Math.min(height, targetHeight)
  };
};

const buildQualityEncodeOptions = (targetWidth: number, targetHeight: number, targetFps: number) => [
  '-preset', 'slow',
  '-crf', '18',
  '-pix_fmt', 'yuv420p',
  '-profile:v', 'high',
  '-level', '4.2',
  '-movflags', '+faststart',
  '-vf', `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease`,
  '-r', String(targetFps),
  '-c:a', 'aac',
  '-b:a', '192k',
  '-ar', '48000'
];

const transcodeWithCodecFallback = (
  filePath: string,
  outputPath: string,
  encodeOptions: string[],
  primaryCodec = 'libx264',
  fallbackCodec = 'mpeg4'
) => new Promise<void>((resolve, reject) => {
  const run = (codec: string) => {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    ffmpeg(filePath)
      .videoCodec(codec)
      .audioCodec('aac')
      .outputOptions(encodeOptions)
      .on('end', () => resolve())
      .on('error', (error) => {
        if (codec !== fallbackCodec) {
          run(fallbackCodec);
          return;
        }
        reject(error);
      })
      .save(outputPath);
  };

  run(primaryCodec);
});

export function analyzeVideo(filePath: string): Promise<VideoAnalysisResult> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err: Error | null, metadata: any) => {
      if (err) {
        return reject(err);
      }

      const probeData = metadata as FFProbeData;
      const format = probeData.format?.format_name || 'unknown';
      const stream = probeData.streams?.find((s: FFProbeStream) => s.codec_type === 'video');
      if (!stream) {
        return reject(new Error('Video stream not found'));
      }

      const width = stream.width || 0;
      const height = stream.height || 0;
      const codec = stream.codec_name || 'unknown';
      const bitrate = Number(probeData.format?.bit_rate || 0);
      const duration = Number(probeData.format?.duration || 0);
      const fps = parseFps(stream.avg_frame_rate);
      const colorSpace = stream.color_space || null;
      const profile = stream.profile || null;

      const recommendedFpsValue = recommendFps(fps);
      const recommendedBitrate = recommendBitrate(width, height);

      resolve({
        format,
        codec,
        width,
        height,
        fps,
        bitrate,
        duration,
        colorSpace,
        profile,
        issues: buildIssues(stream, width, height, bitrate, fps),
        recommended: {
          resolution: recommendResolution(width, height),
          fps: recommendedFpsValue,
          codec: 'h264',
          bitrate: recommendedBitrate,
          colorSpace: 'bt709'
        }
      });
    });
  });
}

export function optimizeVideo(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tmpDir = path.dirname(filePath);
    const outputName = `brax-optimized-${Date.now()}.mp4`;
    const outputPath = path.join(tmpDir, outputName);

    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    ffmpeg.ffprobe(filePath, (err: Error | null, metadata: any) => {
      if (err) {
        return reject(err);
      }

      const probeData = metadata as FFProbeData;
      const videoStream = probeData.streams?.find((s: FFProbeStream) => s.codec_type === 'video');
      if (!videoStream) {
        return reject(new Error('Video stream not found for optimization'));
      }

      const width = Number(videoStream.width || 0);
      const height = Number(videoStream.height || 0);
      const sourceFps = clampFps(parseFps(videoStream.avg_frame_rate));
      const target = resolveTargetDimensions(width, height);
      const targetFps = Math.min(60, Math.max(24, sourceFps));
      const encodeOptions = buildQualityEncodeOptions(target.width, target.height, targetFps);

      transcodeWithCodecFallback(filePath, outputPath, encodeOptions)
        .then(() => resolve(outputPath))
        .catch((error) => reject(error));
    });
  });
}

export function boostVideoFps(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tmpDir = path.dirname(filePath);
    const outputPath = path.join(tmpDir, `brax-fps-boost-${Date.now()}.mp4`);

    ffmpeg.ffprobe(filePath, (probeError: Error | null, metadata: any) => {
      if (probeError) {
        return reject(probeError);
      }

      const probeData = metadata as FFProbeData;
      const videoStream = probeData.streams?.find((stream) => stream.codec_type === 'video');
      const sourceFps = parseFps(videoStream?.avg_frame_rate);
      if (!videoStream || sourceFps <= 0) {
        return reject(new Error('Unable to determine source FPS'));
      }

      const targetFps = Math.min(60, Math.max(30, Math.round(sourceFps * 1.5)));
      const width = Number(videoStream.width || 0);
      const height = Number(videoStream.height || 0);
      const target = resolveTargetDimensions(width, height);
      const encodeOptions = [
        '-preset', 'medium',
        '-crf', '20',
        '-pix_fmt', 'yuv420p',
        '-profile:v', 'high',
        '-level', '4.2',
        '-movflags', '+faststart',
        '-vf', `scale=${target.width}:${target.height}:force_original_aspect_ratio=decrease,minterpolate=fps=${targetFps}:mi_mode=blend`,
        '-r', String(targetFps),
        '-c:a', 'aac',
        '-b:a', '192k',
        '-ar', '48000'
      ];

      transcodeWithCodecFallback(filePath, outputPath, encodeOptions)
        .then(() => resolve(outputPath))
        .catch((error) => reject(error));
    });
  });
}
