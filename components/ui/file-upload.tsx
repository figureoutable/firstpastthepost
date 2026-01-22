"use client";

import * as React from "react";
import { Upload, X, FileText, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
    label: string;
    accept?: string;
    onChange: (file: File | null) => void;
    value?: File | null;
    required?: boolean;
    desc?: string;
}

export function FileUpload({ label, accept, onChange, value, required, desc }: FileUploadProps) {
    const [dragActive, setDragActive] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onChange(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            onChange(e.target.files[0]);
        }
    };

    const removeFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(null);
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };

    return (
        <div className="w-full space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {label} {required && <span className="text-destructive">*</span>}
            </label>
            <div
                className={cn(
                    "relative flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden",
                    dragActive ? "border-primary bg-primary/5" : "border-border/50 bg-secondary/20 hover:bg-secondary/30",
                    value ? "border-green-500/50 bg-green-500/5" : ""
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    className="hidden"
                    type="file"
                    accept={accept}
                    onChange={handleChange}
                />

                {value ? (
                    <div className="flex flex-col items-center gap-2 p-4 text-center animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col max-w-[200px]">
                            <p className="text-sm font-medium truncate">{value.name}</p>
                            <p className="text-xs text-muted-foreground">{(value.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button
                            onClick={removeFile}
                            className="absolute top-2 right-2 p-1 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 p-4 text-center text-muted-foreground">
                        <div className={`p-2 rounded-full transition-colors ${dragActive ? 'bg-primary/20 text-primary' : 'bg-background/50'}`}>
                            <Upload className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <p className="text-sm font-medium text-foreground">Click to upload or drag and drop</p>
                            <p className="text-xs">{desc || "SVG, PNG, JPG or PDF (max 5MB)"}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
