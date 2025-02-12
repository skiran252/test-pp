// content.js
import { AutoProcessor, AutoTokenizer, CLIPTextModelWithProjection, CLIPVisionModelWithProjection, RawImage } from '@xenova/transformers';

let processor: any, tokenizer: any, visionModel: any, textModel: any; // Specify 'any' type if necessary

async function loadModels() {
    console.time('Model Loading (Content Script)');
    processor = await AutoProcessor.from_pretrained('Xenova/clip-vit-base-patch16');
    tokenizer = await AutoTokenizer.from_pretrained('Xenova/clip-vit-base-patch16');
    visionModel = await CLIPVisionModelWithProjection.from_pretrained('Xenova/clip-vit-base-patch16');
    textModel = await CLIPTextModelWithProjection.from_pretrained('Xenova/clip-vit-base-patch16');
    console.timeEnd('Model Loading (Content Script)');
}
loadModels()
// Function to normalize a vector
function normalize(vec: number[]): number[] {
    const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    return vec.map(val => val / norm);
}

export async function runPrediction(frameData: { data: Uint8ClampedArray | Uint8Array; width: number; height: number; }): Promise<string | null> {
    if (!processor) {
        await loadModels();
    }
    if (!processor || !tokenizer || !visionModel || !textModel) {
        console.warn('Models not loaded yet.  Please try again.');
        return null;
    }

    console.time('Total Inference Time (Content Script)');

    try {
        // Preprocess image data
        const rawImage = new RawImage(frameData.data, frameData.width, frameData.height, 3); // Create RawImage from ImageData with 3 channels
        const imageTensor = await processor(rawImage);

        // Simplified labels for binary classification
        const classDescriptions = [
            "person holding a phone or camer and capturing pictures",
            "person not using a phone or camera"
        ];

        const tokenized = await tokenizer(classDescriptions, { padding: true, truncation: true });

        // Extract input_ids and attention_mask
        const { input_ids, attention_mask } = tokenized;

        // Check if input_ids and attention_mask are defined
        if (!input_ids || !attention_mask) {
            console.error("input_ids or attention_mask is undefined");
            return "Error during tokenization";
        }

        const { image_embeds } = await visionModel(imageTensor);
        const { text_embeds } = await textModel({ input_ids, attention_mask });

        // Convert image and text embeddings to arrays
        const imageEmbedArray: number[] = Array.from(image_embeds.data);
        const textEmbedsArrays: number[][] = Array.from({ length: text_embeds.dims[0] }, (_, i) => {
            const start = i * text_embeds.dims[1];
            const end = start + text_embeds.dims[1];
            return Array.from(text_embeds.data.slice(start, end));
        });

        // Normalize embeddings
        const normalizedImageEmbed: number[] = normalize(imageEmbedArray);
        const normalizedTextEmbeds: number[][] = textEmbedsArrays.map(normalize);

        // Function to calculate cosine similarity
        function cosineSimilarity(vecA: number[], vecB: number[]): number {
            let dotProduct = 0;
            for (let i = 0; i < vecA.length; i++) {
                dotProduct += vecA[i] * vecB[i];
            }
            return dotProduct; // Dot product is sufficient after normalization
        }

        // Calculate cosine similarities
        const scores: number[] = normalizedTextEmbeds.map(textEmbedding => cosineSimilarity(normalizedImageEmbed, textEmbedding));
        console.log("Scores:", scores);

        // Use a threshold to predict the class (Binary Classification)
        const threshold = 0.5; // Adjust this threshold as needed
        const predictionIndex: number = scores[0] > scores[1] ? 0 : 1; // Predict based on which score is higher
        const prediction: string = `Predicted class: ${classDescriptions[predictionIndex]}`;
        console.log("Prediction:", prediction);

        console.timeEnd('Total Inference Time (Content Script)');
        return prediction;

    } catch (error) {
        console.error("Error during prediction:", error);
        return "Error during prediction";
    }
}
