import { BrowserRouter, Route, Routes } from "react-router";
import { GraphMap } from "./components/GraphMap";
import { ImageGallery } from "./components/ImageGallery";
import { Main } from "./components/Main";
import { UserTestMain } from "./components/UserTestMain";

export const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/user-test" element={<UserTestMain />} />
        <Route path="/image-gallery" element={<ImageGallery />} />
        <Route path="/graph-map" element={<GraphMap />} />
      </Routes>
    </BrowserRouter>
  );
};
