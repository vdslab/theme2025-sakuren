import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { getPref, prefectures } from "../constant/prefectures";

export const ImageGallery = () => {
  const [images, setImages] = useState<Record<string, string>>({});
  const [selectedPrefecture, setSelectedPrefecture] = useState<Array<string>>(
    []
  );

  const { search } = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const pref = params.getAll("prefecture").map(Number);
    setSelectedPrefecture(pref.map(getPref).filter((p) => p !== null));
  }, [search]);

  useEffect(() => {
    let mounted = true;
    const objectUrls: Record<string, string> = {};

    Promise.all(
      prefectures.map((pref) =>
        fetch(`/rect_wordclouds/${pref}.png`)
          .then((res) => {
            if (!res.ok)
              throw new Error(`Failed to fetch /rect-wordclouds/${pref}.png`);
            return res.blob();
          })
          .then((blob) => {
            const url = URL.createObjectURL(blob);
            objectUrls[pref] = url;
            return { pref, url };
          })
      )
    )
      .then((loadedUrls) => {
        if (mounted) {
          const urlsRecord: Record<string, string> = {};
          loadedUrls.forEach(({ pref, url }) => {
            urlsRecord[pref] = url;
          });
          setImages(urlsRecord);
        }
      })
      .catch((err) => {
        console.error("ImageGallery load error:", err);
      });

    return () => {
      mounted = false;
      Object.values(objectUrls).forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  return (
    <Box p={4}>
      {Object.keys(images).length === 0 ? (
        <Box>Loading images…</Box>
      ) : (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {Object.entries(images).map(([pref, src], i) => (
            <Box key={src + i} display="flex" flexDirection="column">
              <label>{pref}</label>
              <Box
                mt={1}
                border={
                  selectedPrefecture.includes(pref)
                    ? "2px solid #ff0000"
                    : "1px solid #ccc"
                }
              >
                <img src={src} alt={`pref-${pref}`} />
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};
