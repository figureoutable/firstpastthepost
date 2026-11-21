"use client";

import * as React from "react";
import { Upload, X, FileCheck2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { hasUpload } from "@/lib/onboarding-validation";
import { ACCEPTED_UPLOADS, isAcceptedUpload } from "@/lib/compress-image";

interface FileUploadProps {
    label: string;
    onChange: (file: File | null) => void;
    value?: File | string | null;
    required?: boolean;
    desc?: string;
    error?: string;
}

function fileLabel(value: File | string): string {
    if (typeof value !== "string") return value.name;
    const last = value.split("/").filter(Boolean).pop();
    try {
        return last ? decodeURIComponent(last.split("?")[0]) : "Uploaded file";
    } catch {
        return "Uploaded file";
    }
}

function fileSizeLabel(value: File | string): string {
    if (typeof value === "string") return "Uploaded";
    const mb = value.size / 1024 / 1024;
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(value.size / 1024))} KB`;
}

export function FileUpload({ label, onChange, value, required, desc, error }: FileUploadProps) {
    const [dragActive, setDragActive] = React.useState(false);
    const [localError, setLocalError] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);
    const hasFile = hasUpload(value);
    const shownError = localError || error;

    const accept = (file: File | undefined) => {
        if (!file) return;
        if (!isAcceptedUpload(file)) {
            setLocalError("Please choose a PDF or a photo (JPG, PNG, HEIC or WEBP).");
            return;
        }
        setLocalError("");
        onChange(file);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(e.type === "dragenter" || e.type === "dragover");
    };

    const removeFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(null);
        if (inputRef.current) inputRef.current.value = "";
    };

    return (
        <div className="w-full space-y-1.5">
            <p className="text-sm font-medium leading-snug text-stone-800">
                {label}
                {!required && <span className="ml-1 font-normal text-stone-400">(optional)</span>}
            </p>
            <div
                role="button"
                tabIndex={0}
                aria-label={hasFile ? `${label}: ${fileLabel(value as File | string)}. Choose a different file` : `Upload ${label}`}
                className={cn(
                    "relative flex min-h-28 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed px-4 py-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/40",
                    hasFile
                        ? "border-forest-300 bg-forest-50/60"
                        : dragActive
                          ? "border-clay-400 bg-clay-50/60"
                          : shownError
                            ? "border-red-300 bg-white hover:bg-stone-50"
                            : "border-stone-300 bg-white hover:bg-stone-50"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={(e) => {
                    handleDrag(e);
                    setDragActive(false);
                    accept(e.dataTransfer.files?.[0]);
                }}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        inputRef.current?.click();
                    }
                }}
            >
                <input
                    ref={inputRef}
                    className="hidden"
                    type="file"
                    accept={ACCEPTED_UPLOADS}
                    onChange={(e) => {
                        e.preventDefault();
                        accept(e.target.files?.[0]);
                    }}
                />

                {hasFile && value ? (
                    <div className="flex w-full items-center gap-3 text-left">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-forest-100 text-forest-700">
                            <FileCheck2 className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-stone-900">{fileLabel(value)}</span>
                            <span className="block text-xs text-stone-500">{fileSizeLabel(value)} · click to change</span>
                        </span>
                        <button
                            type="button"
                            onClick={removeFile}
                            aria-label={`Remove ${label}`}
                            className="rounded-full p-1.5 text-stone-500 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 text-stone-500">
                        <span className={cn("rounded-full p-2", dragActive ? "bg-clay-100 text-clay-700" : "bg-stone-100")}>
                            <Upload className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-medium text-stone-700">Click to upload or drag a file here</span>
                        <span className="text-xs">{desc || "PDF or photo. Large photos are resized automatically."}</span>
                    </div>
                )}
            </div>
            {shownError && <p className="text-xs text-red-600">{shownError}</p>}
        </div>
    );
}
