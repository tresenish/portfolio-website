// App.js

import React from "react";
import { Route, RouterProvider, createBrowserRouter, createRoutesFromElements } from 'react-router-dom';
import { Analytics } from "@vercel/analytics/react";
import Root from "./components/Root";
import Home from "./components/Home";
import Projects from "./components/Projects";
import Resume from "./components/Resume";
import About from "./components/About";
import Contact from "./components/Contact";

const router = createBrowserRouter(createRoutesFromElements(
  <Route path="/" element={<Root />}>
    <Route index element={<Home />} />
    <Route path="projects" element={<Projects />} />
    <Route path="resume" element={<Resume />} />
    <Route path="about" element={<About />} />
    <Route path="contact" element={<Contact />} />
  </Route>
))

function App() {
  return (
    <>
      <RouterProvider router={router} />
      {/* Vercel Web Analytics — no cookies, production only. Visits from a
          browser with the "va-ignore" localStorage flag (yours) are dropped
          before sending. */}
      <Analytics
        beforeSend={(event) => (localStorage.getItem("va-ignore") ? null : event)}
      />
    </>
  );
}

export default App;