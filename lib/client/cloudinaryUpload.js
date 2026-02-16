const hasCloudinaryConfig = () =>
  Boolean(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) &&
  Boolean(process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const uploadSingleImage = async (file) => {
  if (!file) return "";

  if (!hasCloudinaryConfig()) {
    return fileToDataUrl(file);
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", "thrift-store/products");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const payload = await response.json();
  if (!response.ok || !payload?.secure_url) {
    throw new Error(payload?.error?.message || "Failed to upload image.");
  }

  return payload.secure_url;
};

export const uploadMultipleImages = async (files) => {
  return Promise.all(files.map((file) => uploadSingleImage(file)));
};

