import React from "react";

// Un paso numerado de la sección "Pasos" de un artículo.
// image: { src, alt } opcional — capturas reales generadas con
// scripts/capture-help-screenshots.mjs (ver content.js).
export default function HelpStep({ index, text, image }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
        {index}
      </span>
      <div className="flex-1 space-y-2 pt-0.5">
        <p className="text-sm text-gray-700">{text}</p>
        {image && (
          <img
            src={image.src}
            alt={image.alt || ""}
            loading="lazy"
            className="w-full rounded-md border border-gray-200"
          />
        )}
      </div>
    </li>
  );
}
