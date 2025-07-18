"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = exports.details = void 0;
var flowUtils_1 = require("../../../../FlowHelpers/1.0.0/interfaces/flowUtils");
var details = function () { return ({
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
            tooltip: "\n        Comma separated list of input audio codecs to be processed.\n          \\nExample:\\n\n          ac3,mp3,dts\n        ",
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
}); };
exports.details = details;
/* eslint-disable no-param-reassign */
var plugin = function (args) {
    var lib = require('../../../../../methods/lib')();
    args.inputs = lib.loadDefaultValues(args.inputs, details);
    (0, flowUtils_1.checkFfmpegCommandInit)(args);
    var inputCodec = String(args.inputs.inputCodec).trim().split(',').map(function (item) { return item.trim().toLowerCase(); });
    var outputCodec = String(args.inputs.outputCodec).trim().toLowerCase();
    var enableBitrate = Boolean(args.inputs.enableBitrate);
    var bitrate = String(args.inputs.bitrate);
    var encoderName;
    switch (outputCodec) {
        case 'aac':
            encoderName = 'libfdk_aac';
            break;
        case 'mp3':
            encoderName = 'libmp3lame';
            break;
        case 'dts':
            encoderName = 'dca';
            break;
        case 'opus':
            encoderName = 'libopus';
            break;
        case 'vorbis':
            encoderName = 'libvorbis';
            break;
        default:
            encoderName = String(outputCodec);
    }
    args.variables.ffmpegCommand.streams.forEach(function (stream, index) {
        var _a;
        var shouldProcess = stream.codec_type.toLowerCase() === 'audio'
            && inputCodec.includes(stream.codec_name);
        if (shouldProcess) {
            args.jobLog("Stream with index ".concat(index, " has codec ").concat(stream.codec_name, " that matches one of input codec"));
            args.jobLog("Will be encoded into ".concat(outputCodec, " with ").concat(encoderName));
            stream.outputArgs.push('-c:{outputIndex}', encoderName);
            if (enableBitrate) {
                var totalBitrate = ((_a = stream.channels) !== null && _a !== void 0 ? _a : 2) * parseInt(bitrate, 10);
                args.jobLog("Total bitrate will be set to ".concat(totalBitrate, "k based on number of channel and per channel bitrate"));
                stream.outputArgs.push('-b:a:{outputTypeIndex}', String("".concat(totalBitrate, "k")));
            }
        }
    });
    return {
        outputFileObj: args.inputFileObj,
        outputNumber: 1,
        variables: args.variables,
    };
};
exports.plugin = plugin;
