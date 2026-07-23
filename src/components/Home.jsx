import React from "react";
// import ThreeDModelViewer from "./ThreeDModelViewer"; // cat model, parked for now
import HoloModelViewer from "./HoloModelViewer";

/* Default view of the content pane: just the model, nothing to read. */
export default function Home() {
  return (
    <div className="h-[calc(100vh-3.5rem)] max-nav:h-[55vh] animate-rise motion-reduce:animate-none">
      <HoloModelViewer />
    </div>
  );
}
