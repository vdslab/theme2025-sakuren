import { BrowserRouter, Route, Routes } from "react-router";
import { ImageGallery } from "./components/ImageGallery";
import { Main } from "./components/Main";

export const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/image-gallery" element={<ImageGallery />} />
      </Routes>
    </BrowserRouter>
  );
};
