import { checkFfmpegCommandInit } from '../../../../FlowHelpers/1.0.0/interfaces/flowUtils';
import {
  IpluginDetails,
  IpluginInputArgs,
  IpluginOutputArgs,
} from '../../../../FlowHelpers/1.0.0/interfaces/interfaces';

const details = (): IpluginDetails => ({
  name: 'Set Audio Encoder',
  description: 'Set the audio encoder for all streams',
  style: {
    borderColor: '#6efefc',
  },
  tags: 'video',
  isStartPlugin: false,
  pType: '',
  requiresVersion: '2.11.01',
  sidebarPosition: -1,
  icon: '',
  inputs: [
    {
      label: 'Input Codec',
      name: 'inputCodec',
      type: 'string',
      defaultValue: 'ac3',
      inputUI: {
        type: 'text',
      },
      tooltip:
        `
        Comma separated list of input audio codecs to be processed.
          \\nExample:\\n
          ac3,mp3,dts
        `,
    },
    {
      label: 'Output Codec',
      name: 'outputCodec',
      type: 'string',
      defaultValue: 'aac',
      inputUI: {
        type: 'dropdown',
        options: [
          'aac',
          'ac3',
          'eac3',
          'dts',
          'flac',
          'opus',
          'mp2',
          'mp3',
          'truehd',
          'vorbis',
        ],
      },
      tooltip: 'Output audio codec of the output file.',
    },
    {
      label: 'Enable Bitrate',
      name: 'enableBitrate',
      type: 'boolean',
      defaultValue: 'false',
      inputUI: {
        type: 'switch',
      },
      tooltip: 'Toggle whether to enable setting audio bitrate',
    },
    {
      label: 'Per channel Bitrate',
      name: 'bitrate',
      type: 'string',
      defaultValue: '64k',
      inputUI: {
        type: 'text',
        displayConditions: {
          logic: 'AND',
          sets: [
            {
              logic: 'AND',
              inputs: [
                {
                  name: 'enableBitrate',
                  value: 'true',
                  condition: '===',
                },
              ],
            },
          ],
        },
      },
      tooltip: 'Specify per channel bitrate for the audio, 64k in a 2 channel audio will result in 128k audio bitrate',
    },
  ],
  outputs: [
    {
      number: 1,
      tooltip: 'Continue to next plugin',
    },
  ],
});

/* eslint-disable no-param-reassign */
const plugin = (args: IpluginInputArgs): IpluginOutputArgs => {
  const lib = require('../../../../../methods/lib')();
  args.inputs = lib.loadDefaultValues(args.inputs, details);

  checkFfmpegCommandInit(args);

  const inputCodec = String(args.inputs.inputCodec).trim().split(',').map((item) => item.trim().toLowerCase());
  const outputCodec = String(args.inputs.outputCodec).trim().toLowerCase();
  const enableBitrate = Boolean(args.inputs.enableBitrate);
  const bitrate = String(args.inputs.bitrate);

  let encoderName: string;

  switch (outputCodec) {
    case 'aac':
      encoderName = 'libfdk_aac'; break;
    case 'mp3':
      encoderName = 'libmp3lame'; break;
    case 'dts':
      encoderName = 'dca'; break;
    case 'opus':
      encoderName = 'libopus'; break;
    case 'vorbis':
      encoderName = 'libvorbis'; break;
    default:
      encoderName = String(outputCodec);
  }

  args.variables.ffmpegCommand.streams.forEach((stream, index) => {
    const shouldProcess = stream.codec_type.toLowerCase() === 'audio'
      && inputCodec.includes(stream.codec_name);

    if (shouldProcess) {
      args.jobLog(`Stream with index ${index} has codec ${stream.codec_name} that matches one of input codec`);
      args.jobLog(`Will be encoded into ${outputCodec} with ${encoderName}`);
      stream.outputArgs.push('-c:{outputIndex}', encoderName);

      if (enableBitrate) {
        const totalBitrate = (stream.channels ?? 2) * parseInt(bitrate, 10);
        args.jobLog(`Total bitrate will be set to ${totalBitrate}k based on number of channel and per channel bitrate`);
        stream.outputArgs.push('-b:a', String(`${totalBitrate}k`));
      }
    }
  });

  return {
    outputFileObj: args.inputFileObj,
    outputNumber: 1,
    variables: args.variables,
  };
};

export {
  details,
  plugin,
};
