// services/vision.js
const {
  RekognitionClient,
  DetectLabelsCommand,
  DetectModerationLabelsCommand,
  DetectFacesCommand
} = require("@aws-sdk/client-rekognition");
const { env } = require('../config/env');

const client = new RekognitionClient({ region: env.aws.region });

async function analyzeS3Image({ bucket, key }) {
  const Image = { S3Object: { Bucket: bucket, Name: key } };

  const [labelsRes, modRes, facesRes] = await Promise.all([
    client.send(new DetectLabelsCommand({ Image, MaxLabels: 15, MinConfidence: 80 })),
    client.send(new DetectModerationLabelsCommand({ Image, MinConfidence: 80 })),
    client.send(new DetectFacesCommand({ Image, Attributes: ["DEFAULT"] }))
  ]);

  const tags = (labelsRes.Labels || []).map(l => l.Name).slice(0, 10);
  const nsfw = (modRes.ModerationLabels || []).length > 0;
  const faceCount = (facesRes.FaceDetails || []).length;

  return {
    tags,
    nsfw,
    faceCount,
    raw: {
      labels: labelsRes.Labels,
      moderation: modRes.ModerationLabels,
      faces: facesRes.FaceDetails
    }
  };
}

module.exports = { analyzeS3Image };
