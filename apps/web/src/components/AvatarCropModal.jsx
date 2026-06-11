import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import ModalFooter from './layout/ModalFooter';

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

const getCroppedImg = async (imageSrc, pixelCrop, rotation = 0) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  canvas.width = safeArea;
  canvas.height = safeArea;

  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-safeArea / 2, -safeArea / 2);

  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  );

  const data = ctx.getImageData(0, 0, safeArea, safeArea);

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
  );

  return new Promise((resolve) => {
    // Compress: cap at 512px max dimension, JPEG quality 0.75
    const MAX_DIM = 512;
    let finalW = pixelCrop.width;
    let finalH = pixelCrop.height;
    if (finalW > MAX_DIM || finalH > MAX_DIM) {
      const scale = MAX_DIM / Math.max(finalW, finalH);
      finalW = Math.round(finalW * scale);
      finalH = Math.round(finalH * scale);
    }
    // If we need to resize, draw onto a smaller canvas
    if (finalW !== pixelCrop.width || finalH !== pixelCrop.height) {
      const resizedCanvas = document.createElement('canvas');
      resizedCanvas.width = finalW;
      resizedCanvas.height = finalH;
      const rctx = resizedCanvas.getContext('2d');
      rctx.drawImage(canvas, 0, 0, finalW, finalH);
      resizedCanvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.75);
    } else {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.75);
    }
  });
};

const AvatarCropModal = ({ isOpen, imageSrc, onClose, onCropComplete }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);

  const onCropChange = useCallback((location) => setCrop(location), []);
  const onZoomChange = useCallback((z) => setZoom(z), []);

  const onCropAreaComplete = useCallback((croppedArea, croppedAreaPx) => {
    setCroppedAreaPixels(croppedAreaPx);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    try {
      setSaving(true);
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, 0);
      if (!croppedBlob) throw new Error('Gagal memproses gambar');
      const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
      onCropComplete(file);
    } catch (err) {
      console.error('Error cropping image:', err);
      alert('Gagal memotong gambar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-surface-container rounded-xl border border-outline-variant overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-md border-b border-outline-variant flex items-center justify-between shrink-0">
          <h3 className="font-headline-md text-headline-md text-on-surface">Pangkas Foto Profil</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-full text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Crop Area — responsive: 300px mobile, 400px desktop */}
        <div className="relative w-full h-[300px] md:h-[400px] shrink-0">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={true}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropAreaComplete}
          />
        </div>

        {/* Zoom Slider */}
        <div className="px-md py-sm shrink-0">
          <label className="font-label-sm text-label-sm text-on-surface-variant mb-xs block">
            Zoom: {zoom.toFixed(1)}x
          </label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        {/* Actions */}
        <ModalFooter className="shrink-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !croppedAreaPixels}
            className={`h-11 w-full md:w-auto px-md rounded-lg font-bold transition-all duration-200 flex items-center justify-center ${
              saving || !croppedAreaPixels
                ? 'bg-slate-600 text-slate-400 opacity-50 cursor-not-allowed'
                : 'bg-primary text-on-primary hover:opacity-90 shadow-lg shadow-primary/20'
            }`}
          >
            {saving ? 'Memproses...' : 'Simpan Foto'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full md:w-auto px-md rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container transition-colors flex items-center justify-center"
          >
            Batal
          </button>
        </ModalFooter>
      </div>
    </div>
  );
};

export default AvatarCropModal;