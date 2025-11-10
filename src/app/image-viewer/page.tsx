/**
 * Image Viewer Component for the HDRI Calibration Tool.
 *
 * This component provides an in-app HDR image viewer with zoom and pan controls.
 * It displays HDR images from the output directory and allows interactive viewing
 * with basic image manipulation controls.
 *
 * Built using Shadcn UI components to maintain consistency with the rest of the application.
 */
"use client";

import React, { useEffect, useState } from "react";
import { useSettingsStore } from "../stores/settings-store";
import { invoke } from "@tauri-apps/api/core";
import { basename } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ZoomIn, ZoomOut, Move, RotateCcw, Download, FolderOpen, ImageIcon } from "lucide-react";

/**
 * Main Image Viewer component
 *
 * @returns React component with interactive image viewer interface
 */

export default function ImageViewer() {
	const { settings } = useSettingsStore();
	const outputPath = settings.outputPath;
	const isWindows = settings.osPlatform === "windows";

	const [error, setError] = useState<string | null>(null);
	const [selectedImages, setSelectedImages] = useState<string[]>([]);
	const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
	const [imageFullPaths, setImageFullPaths] = useState<string[]>([]);
	
	const [zoom, setZoom] = useState<number>(100);
	const [panX, setPanX] = useState<number>(0);
	const [panY, setPanY] = useState<number>(0);
	const [rotation, setRotation] = useState<number>(0);
	
	useEffect(() => {
		async function loadFiles() {
			try {
				const files = await populateGrid(outputPath);
				const relativeFiles = await Promise.all(
					files.map((file) => basename(file))
				);
				
				setSelectedImages(relativeFiles);
				setImageFullPaths(files);
			} catch (error) {
				console.error("Error loading HDR images:", error);
				setError("Failed to load HDR images from output directory");
			}
		}
		loadFiles();
	}, [outputPath]);

	// opens a file browser dialog to select additional HDR images

	async function browseAndOpen() {
		setError(null);
		try {
			const files = await open({
				multiple: true,
				defaultPath: outputPath,
				filters: [{ name: "HDR Images", extensions: ["hdr"] }],
			});

			if (files) {
				const images = Array.isArray(files) ? files : [files];
				const newRelativeFiles = await Promise.all(
					images.map((file) => basename(file))
				);
				
				setSelectedImages((prev) => [...prev, ...newRelativeFiles]);
				setImageFullPaths((prev) => [...prev, ...images]);
			}
		} catch (err) {
			console.error("Error during file selection:", err);
			setError("Failed to select HDR images");
		}
	}
  
	async function populateGrid(dir: string): Promise<string[]> {
		try {
			const entries = await invoke<string[]>("read_dynamic_dir", { path: dir });
			const hdrPaths: string[] = [];

			if (Array.isArray(entries)) {
				for (const entry of entries) {
					if (typeof entry === "string" && entry.toLowerCase().endsWith(".hdr")) {
						hdrPaths.push(entry);
					}
				}
			}
			return hdrPaths;
		} catch (error) {
			console.error("Error reading HDR files:", error);
			return [];
		}
	}


	function resetView() {
		setZoom(100);
		setPanX(0);
		setPanY(0);
		setRotation(0);
	}

	function handleZoomIn() {
		setZoom((prev) => Math.min(prev + 10, 400));
	}

	function handleZoomOut() {
		setZoom((prev) => Math.max(prev - 10, 10));
	}

	const currentImage = selectedImages[currentImageIndex];
	const currentImagePath = imageFullPaths[currentImageIndex];

	return (
		<div className="flex h-full w-screen divide-x">
			<div className="flex-1 flex flex-col overflow-hidden bg-background">
				<div className="border-b p-4 flex items-center justify-between bg-accent/50">
					<div className="flex items-center gap-2">
						<ImageIcon className="h-5 w-5" />
						<h1 className="text-lg font-semibold">HDR Image Viewer</h1>
					</div>
					{currentImage && (
						<div className="text-sm text-muted-foreground">
							{currentImageIndex + 1} / {selectedImages.length}
						</div>
					)}
				</div>

				<div className="flex-1 flex items-center justify-center p-8 overflow-auto bg-muted/30">
					{currentImage ? (
						<div className="relative border-2 border-border rounded-lg overflow-hidden bg-background">
							<div 
								className="flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900"
								style={{
									width: `${600 * (zoom / 100)}px`,
									height: `${400 * (zoom / 100)}px`,
									transform: `translate(${panX}px, ${panY}px) rotate(${rotation}deg)`,
									transition: "transform 0.2s ease-out"
								}}
							>
								<div className="text-center text-white/80">
									<ImageIcon className="h-24 w-24 mx-auto mb-4 opacity-50" />
									<p className="text-lg font-medium">{currentImage}</p>
									<p className="text-sm text-white/60 mt-2">
										HDR Preview Placeholder
									</p>
									<p className="text-xs text-white/40 mt-1">
										Zoom: {zoom}% | Pan: ({panX}, {panY})
									</p>
								</div>
							</div>
						</div>
					) : (
						<div className="text-center text-muted-foreground">
							<ImageIcon className="h-24 w-24 mx-auto mb-4 opacity-20" />
							<p className="text-lg">No HDR images loaded</p>
							<p className="text-sm mt-2">
								Browse files or check your output directory: 
								<span className="font-mono block mt-1">{outputPath}</span>
							</p>
						</div>
					)}
				</div>

				{selectedImages.length > 0 && (
					<div className="border-t p-4 bg-accent/50">
						<div className="flex gap-2 overflow-x-auto">
							{selectedImages.map((image, index) => (
								<button
									key={index}
									onClick={() => setCurrentImageIndex(index)}
									className={`
										flex-shrink-0 px-3 py-2 rounded border text-sm
										${index === currentImageIndex 
											? 'bg-primary text-primary-foreground border-primary' 
											: 'bg-background border-border hover:bg-accent'}
									`}
								>
									{image}
								</button>
							))}
						</div>
					</div>
				)}
			</div>

			<div className="bg-accent w-96 shrink-0 overflow-y-auto">
				<div className="p-4 border-b">
					<Button 
						onClick={browseAndOpen}
						className="w-full"
						variant="outline"
					>
						<FolderOpen className="h-4 w-4 mr-2" />
						Browse HDR Images
					</Button>
					
					{error && (
						<p className="text-sm text-destructive mt-2">{error}</p>
					)}
					
					{isWindows && (
						<p className="text-sm text-yellow-600 mt-2">
							Some features may be limited on Windows due to OS restrictions.
						</p>
					)}
				</div>

				<Accordion type="single" collapsible className="border-t">
					<AccordionItem value="item-1" className="px-4">
						<Tooltip>
							<TooltipTrigger asChild>
								<AccordionTrigger>Zoom Controls</AccordionTrigger>
							</TooltipTrigger>
							<TooltipContent>
								Adjust the zoom level of the HDR image
							</TooltipContent>
						</Tooltip>
						<AccordionContent className="flex flex-col gap-4">
							<Field>
								<FieldLabel>Zoom Level</FieldLabel>
								<FieldContent className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleZoomOut}
                    disabled={zoom <= 10}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={zoom}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setZoom(Number(e.target.value))}
                    className="text-center"
                    min={10}
                    max={400}
                  />
									<span className="text-sm text-muted-foreground">%</span>
									<Button
										size="sm"
										variant="outline"
										onClick={handleZoomIn}
										disabled={zoom >= 400}
									>
										<ZoomIn className="h-4 w-4" />
									</Button>
								</FieldContent>
							</Field>

							<Field>
								<FieldLabel>Zoom Presets</FieldLabel>
								<FieldContent className="flex gap-2">
									<Button 
										size="sm" 
										variant="outline" 
										onClick={() => setZoom(50)}
									>
										50%
									</Button>
									<Button 
										size="sm" 
										variant="outline" 
										onClick={() => setZoom(100)}
									>
										100%
									</Button>
									<Button 
										size="sm" 
										variant="outline" 
										onClick={() => setZoom(200)}
									>
										200%
									</Button>
								</FieldContent>
							</Field>
						</AccordionContent>
					</AccordionItem>

					<AccordionItem value="item-2" className="px-4">
						<Tooltip>
							<TooltipTrigger asChild>
								<AccordionTrigger>Pan Controls</AccordionTrigger>
							</TooltipTrigger>
							<TooltipContent>
								Move the image horizontally and vertically
							</TooltipContent>
						</Tooltip>
						<AccordionContent className="flex flex-col gap-4">
							<Field>
								<FieldLabel className="flex items-center gap-2">
									<Move className="h-4 w-4" />
									Pan Position
								</FieldLabel>
								<FieldContent className="flex flex-col gap-2">
									<div className="flex items-center gap-2">
										<span className="text-sm w-8">X:</span>
										<Input
											type="number"
											value={panX}
											onChange={(e) => setPanX(Number(e.target.value))}
										/>
										<span className="text-sm text-muted-foreground">px</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="text-sm w-8">Y:</span>
										<Input
											type="number"
											value={panY}
											onChange={(e) => setPanY(Number(e.target.value))}
										/>
										<span className="text-sm text-muted-foreground">px</span>
									</div>
								</FieldContent>
							</Field>

							<Button 
								size="sm" 
								variant="outline"
								onClick={() => { setPanX(0); setPanY(0); }}
							>
								Center Image
							</Button>
						</AccordionContent>
					</AccordionItem>

					<AccordionItem value="item-3" className="px-4">
						<AccordionTrigger>Advanced Controls</AccordionTrigger>
						<AccordionContent className="flex flex-col gap-4">
							<Field>
								<FieldLabel>Rotation</FieldLabel>
								<FieldContent className="flex items-center gap-2">
									<Input
										type="number"
										value={rotation}
										onChange={(e) => setRotation(Number(e.target.value))}
									/>
									<span className="text-sm text-muted-foreground">°</span>
								</FieldContent>
							</Field>

							<Button
								variant="outline"
								onClick={resetView}
								className="w-full"
							>
								<RotateCcw className="h-4 w-4 mr-2" />
								Reset View
							</Button>

							<Button
								variant="outline"
								className="w-full"
								disabled
							>
								<Download className="h-4 w-4 mr-2" />
								Export View (Coming Soon)
							</Button>
						</AccordionContent>
					</AccordionItem>

					<AccordionItem value="item-4" className="px-4">
						<AccordionTrigger>Image Information</AccordionTrigger>
						<AccordionContent className="flex flex-col gap-2 text-sm">
							{currentImage ? (
								<>
									<div className="flex justify-between py-1 border-b">
										<span className="text-muted-foreground">Filename:</span>
										<span className="font-mono text-xs">{currentImage}</span>
									</div>
									<div className="flex justify-between py-1 border-b">
										<span className="text-muted-foreground">Path:</span>
										<span className="font-mono text-xs truncate max-w-[180px]">
											{currentImagePath}
										</span>
									</div>
									<div className="flex justify-between py-1 border-b">
										<span className="text-muted-foreground">Format:</span>
										<span>HDR</span>
									</div>
									<div className="flex justify-between py-1">
										<span className="text-muted-foreground">Status:</span>
										<span className="text-green-600">Loaded</span>
									</div>
								</>
							) : (
								<p className="text-muted-foreground text-center py-4">
									No image selected
								</p>
							)}
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>
		</div>
	);
}