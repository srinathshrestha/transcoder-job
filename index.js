// Importing required libraries
const functions = require('@google-cloud/functions-framework');
const { TranscoderServiceClient } = require('@google-cloud/video-transcoder');
const { Storage } = require('@google-cloud/storage');

// Instantiating clients
const transcoderClient = new TranscoderServiceClient();
const storage = new Storage();

// Register a CloudEvent callback with the Functions Framework that will
// be triggered by Cloud Storage.
functions.cloudEvent('transcodeOnUpload', async (cloudEvent) => {
  console.log(`Event ID: ${cloudEvent.id}`);
  console.log(`Event Type: ${cloudEvent.type}`);

  const file = cloudEvent.data;
  console.log(`Bucket: ${file.bucket}`);
  console.log(`File: ${file.name}`);

  try {
    // Initiate the transcoding job
    const parent = transcoderClient.locationPath('poised-artwork-435918-s3', 'asia-south1');
    const inputUri = `gs://${file.bucket}/${file.name}`;
    const outputUri = `gs://movie-streaming-hls-output/${file.name.split('.')[0]}/`;
    const job = {
        inputUri: inputUri, // The input video path in the GCS bucket
        outputUri: `${outputUri}`, // Base output folder path
        config: {
          elementaryStreams: [
            // Video Streams for 360p, 720p, 1080p
            {
              key: 'video_360p',
              videoStream: {
                h264: {
                  heightPixels: 360,
                  widthPixels: 640,
                  bitrateBps: 400000,
                  frameRate: 30,
                  gopDuration: { seconds: 2 }, // Keyframe interval for segmentation
                },
              },
            },
            {
              key: 'video_720p',
              videoStream: {
                h264: {
                  heightPixels: 720,
                  widthPixels: 1280,
                  bitrateBps: 2500000,
                  frameRate: 30,
                  gopDuration: { seconds: 2 }, // Keyframe interval for segmentation
                },
              },
            },
            {
              key: 'video_1080p',
              videoStream: {
                h264: {
                  heightPixels: 1080,
                  widthPixels: 1920,
                  bitrateBps: 5000000,
                  frameRate: 30,
                  gopDuration: { seconds: 2 }, // Keyframe interval for segmentation
                },
              },
            },
            // Audio Stream
            {
              key: 'audio_stream',
              audioStream: {
                codec: 'aac', // Audio codec
                bitrateBps: 128000, // Audio bitrate
              },
            },
          ],
          muxStreams: [
            // 360p Segments
            {
              container: 'ts',
              elementaryStreams: ['video_360p', 'audio_stream'],
              fileName: 'segment_360p_%04d.ts', // Naming convention for 360p
              key: 'hls_360p',
              segmentSettings: {
                segmentDuration: { seconds: 6 }, // Duration of each segment
              },
            },
            // 720p Segments
            {
              container: 'ts',
              elementaryStreams: ['video_720p', 'audio_stream'],
              fileName: 'segment_720p_%04d.ts', // Naming convention for 720p
              key: 'hls_720p',
              segmentSettings: {
                segmentDuration: { seconds: 6 }, // Duration of each segment
              },
            },
            // 1080p Segments
            {
              container: 'ts',
              elementaryStreams: ['video_1080p', 'audio_stream'],
              fileName: 'segment_1080p_%04d.ts', // Naming convention for 1080p
              key: 'hls_1080p',
              segmentSettings: {
                segmentDuration: { seconds: 6 }, // Duration of each segment
              },
            },
          ],
          manifests: [
            {
              fileName: 'master.m3u8', // The HLS playlist
              type: 'HLS',
              muxStreams: ['hls_360p', 'hls_720p', 'hls_1080p'], // Referencing all resolutions
            },
          ],
        },
      };

    

    
    const [response] = await transcoderClient.createJob({ parent, job });
    console.log(`Job ${response.name} created for file ${file.name}`);
  } catch (error) {
    console.error('Error in transcoder job:', error);
  }
});

