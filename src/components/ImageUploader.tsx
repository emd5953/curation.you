import * as React from "react";
import { useState, useRef } from "react";
import { Upload, X } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface ImageUploaderProps {
  images: string[];
  setImages: React.Dispatch<React.SetStateAction<string[]>>;
  maxImages?: number;
  label: string;
}

export function ImageUploader({ images, setImages, maxImages = 5, label }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (images.length + files.length > maxImages) {
      alert(`You can only upload up to ${maxImages} images.`);
      return;
    }

    files.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-muted-foreground uppercase tracking-wider">{label}</h3>
        <span className="text-sm text-muted-foreground">{images.length} / {maxImages}</span>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {images.map((img, i) => (
          <div key={i} className="relative aspect-square group overflow-hidden rounded-lg border border-white/10">
            <img src={img} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
            <button
              onClick={() => removeImage(i)}
              className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        
        {images.length < maxImages && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/10 rounded-lg hover:border-white/20 hover:bg-white/5 transition-all"
          >
            <Upload className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Upload</span>
          </button>
        )}
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
      />
    </div>
  );
}
