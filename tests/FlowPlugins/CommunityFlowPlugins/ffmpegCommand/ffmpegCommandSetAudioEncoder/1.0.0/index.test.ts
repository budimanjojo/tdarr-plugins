import { plugin } from
  '../../../../../../FlowPluginsTs/CommunityFlowPlugins/ffmpegCommand/ffmpegCommandSetAudioEncoder/1.0.0/index';
import { IpluginInputArgs } from '../../../../../../FlowPluginsTs/FlowHelpers/1.0.0/interfaces/interfaces';
import { IFileObject } from '../../../../../../FlowPluginsTs/FlowHelpers/1.0.0/interfaces/synced/IFileObject';

const sampleH264 = require('../../../../../sampleData/media/sampleH264_1.json');

describe('ffmpegCommandSetAudioEncoder Plugin', () => {
  let baseArgs: IpluginInputArgs;

  const createStream = (index: number, codec_name: string, codec_type: string, channels?: number) => ({
    index,
    codec_name,
    codec_type,
    removed: false,
    forceEncoding: false,
    inputArgs: [],
    outputArgs: [],
    mapArgs: ['-map', `0:${index}`],
    ...(channels !== undefined ? { channels }: {})
  });

  beforeEach(() => {
    baseArgs = {
      inputs: {
        inputCodec: 'ac3,mp3',
        outputCodec: 'aac',
        enableBitrate: true,
        bitrate: '64k',
      },
      variables: {
        ffmpegCommand: {
          init: true,
          inputFiles: [],
          streams: [
            createStream(0, 'h264', 'video'),
            createStream(1, 'ac3', 'audio'),
            createStream(2, 'aac', 'audio'),
            createStream(3, 'mp3', 'AUDIO', 5),
          ],
          container: 'mkv',
          hardwareDecoding: false,
          shouldProcess: false,
          overallInputArguments: [],
          overallOuputArguments: [],
        },
        flowFailed: false,
        user: {},
      },
      inputFileObj: JSON.parse(JSON.stringify(sampleH264)) as IFileObject,
      jobLog: jest.fn(),
    } as Partial<IpluginInputArgs> as IpluginInputArgs;
  });

  describe('Basic Audio Encoder Processing', () => {
    it('should transcode matching audio streams', () => {
      const result = plugin(baseArgs);

      expect(result.outputNumber).toBe(1);
      expect(result.outputFileObj).toBe(baseArgs.inputFileObj);
      expect(result.variables.ffmpegCommand.streams[1].outputArgs).toEqual(['-c:{outputIndex}', 'libfdk_aac', '-b:a:{outputTypeIndex}', '128k']);
      expect(result.variables.ffmpegCommand.streams[2].outputArgs).toEqual([]);
      expect(result.variables.ffmpegCommand.streams[3].outputArgs).toEqual(['-c:{outputIndex}', 'libfdk_aac', '-b:a:{outputTypeIndex}', '320k']);
    });

    it('should not modify video stream', () => {
      const result = plugin(baseArgs);

      expect(result.variables.ffmpegCommand.streams[0].outputArgs).toEqual([]);
    });

    it('should preserve original stream structure', () => {
      const originalStreams = JSON.parse(JSON.stringify(baseArgs.variables.ffmpegCommand.streams));
      const result = plugin(baseArgs);

      expect(result.variables.ffmpegCommand.streams[0].index).toBe(originalStreams[0].index);
      expect(result.variables.ffmpegCommand.streams[0].codec_type).toBe(originalStreams[0].codec_type);
      expect(result.variables.ffmpegCommand.streams[1].index).toBe(originalStreams[1].index);
      expect(result.variables.ffmpegCommand.streams[1].codec_type).toBe(originalStreams[1].codec_type);
      expect(result.variables.ffmpegCommand.streams[2].index).toBe(originalStreams[2].index);
      expect(result.variables.ffmpegCommand.streams[2].codec_type).toBe(originalStreams[2].codec_type);
      expect(result.variables.ffmpegCommand.streams[3].index).toBe(originalStreams[3].index);
      expect(result.variables.ffmpegCommand.streams[3].codec_type).toBe(originalStreams[3].codec_type);
    });

    it('should not modify bitrate when enableBitrate is false', () => {
      baseArgs.inputs.enableBitrate = false;
      const result = plugin(baseArgs);

      expect(result.variables.ffmpegCommand.streams[1].outputArgs).not.toContain('-b:a');
      expect(result.variables.ffmpegCommand.streams[3].outputArgs).not.toContain('-b:a');
    });
  });

  describe('Different Encoder Based On Output Codec', () => {
    const encoderMap = new Map<string, string>([
      ['aac', 'libfdk_aac'],
      ['ac3', 'ac3'],
      ['dts', 'dca'],
      ['flac', 'flac'],
      ['opus', 'libopus'],
      ['mp2', 'mp2'],
      ['mp3', 'libmp3lame'],
      ['truehd', 'truehd'],
      ['vorbis', 'libvorbis'],
    ])

    encoderMap.forEach((value, key) => {
      it(`should use ${value} for ${key} encoder`, () => {
        baseArgs.inputs.outputCodec = key;

        const result = plugin(baseArgs);
        expect(result.variables.ffmpegCommand.streams[1].outputArgs).toContain(value);
        expect(result.variables.ffmpegCommand.streams[3].outputArgs).toContain(value);
      });
    });
  });
});
