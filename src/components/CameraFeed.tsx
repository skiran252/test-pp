import React, { useEffect, useRef, useState } from "react";
import { sendToBackground } from "@plasmohq/messaging";

interface PredictionRequest {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

interface PredictionResponse {
  prediction: string;
}

const CameraFeed = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [prediction, setPrediction] = useState<string>("");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera: ", err);
      }
    };

    startCamera();

    return () => {
      stopPredictionLoop();
    };
  }, []);

  const captureFrame = (): ImageData | null => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D; // Type assertion
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
    return null;
  };

  const sendFrameForPrediction = async () => {
    const frameData = captureFrame();

    if (!frameData) {
      console.warn("No image captured.");
      return;
    }

    try {
      const response = await sendToBackground<ImageData, PredictionResponse>({
        name: "predict",
        body: frameData,
      });

      setPrediction(response.prediction || "Prediction failed");
    } catch (error) {
      console.error("Error during prediction:", error);
      setPrediction("Prediction failed");
    }
  };

  const startPredictionLoop = () => {
    if (!isRunning) {
      setIsRunning(true);
      intervalRef.current = window.setInterval(sendFrameForPrediction, 1000);
    }
  };

  const stopPredictionLoop = () => {
    if (isRunning) {
      setIsRunning(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = null; // Reset intervalRef
    }
  };

  const togglePrediction = () => {
    if (isRunning) {
      stopPredictionLoop();
    } else {
      startPredictionLoop();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="relative w-full max-w-2xl rounded-lg shadow-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full aspect-video object-cover"
        />
      </div>

      <button
        onClick={togglePrediction}
        className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline z-10 relative"
      >
        {isRunning ? "Stop Prediction" : "Start Prediction"}
      </button>

      <p className="mt-4 text-lg font-semibold text-gray-700">
        Prediction: <span className="font-normal">{prediction || "No prediction available."}</span>
      </p>
    </div>
  );
};

export default CameraFeed;
