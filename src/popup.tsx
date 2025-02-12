import React, { useEffect, useRef, useState } from "react";
import CameraFeed from "~components/CameraFeed";
const CameraFeedComponent = () => {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-100 py-10"> {/* Added py-10 for padding */}
      <CameraFeed />
    </div>
  );
};

export default CameraFeedComponent;
