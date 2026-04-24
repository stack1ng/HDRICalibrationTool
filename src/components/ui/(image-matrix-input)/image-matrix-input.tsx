import {
	Control,
	FieldValues,
	FieldPathByValue,
	useController,
	RegisterOptions,
} from "react-hook-form";
import { Field, FieldContent } from "../field";
import { FieldError } from "../field";
import {
	TauriDropzone,
	DropzoneChildrenProps,
} from "@/components/ui/tauri-dropzone";
import { cn } from "@/lib/utils";
import { ArrowDownOnSquareStackIcon } from "@heroicons/react/24/solid";
import { imageFileExtensions } from "@/lib/image-file-extensions";
import { toast } from "sonner";
import path from "path";
import { useCallback } from "react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { DialogFilter, open } from "@tauri-apps/plugin-dialog";
import { DirEntry, readDir, stat } from "@tauri-apps/plugin-fs";
import { ImageSet, ImageSetPreview } from "../image-set-preview";
import { onDrop as onDropHandler } from "./onDrop";

type FileMatrixFieldName<T extends FieldValues> = FieldPathByValue<
	T,
	ImageSet[] | undefined
>;
type FileMatrixInputProps<
	T extends FieldValues,
	TName extends FileMatrixFieldName<T>,
> = {
	control: Control<T>;
	name: TName;
	className?: string;
	rules?: Omit<RegisterOptions<T, TName>, "validate"> & {
		validate?: RegisterOptions<T, TName>["validate"];
	};
};

const imageFilters: DialogFilter[] = [
	{ name: "Images", extensions: imageFileExtensions },
];

export type FullDirEntry = DirEntry & {
	path: string;
};

export function ImageMatrixInput<
	T extends FieldValues,
	TName extends FileMatrixFieldName<T>,
>({ control, name, className, rules }: FileMatrixInputProps<T, TName>) {
	// todo: properly handle field states
	const { field, fieldState } = useController<T, TName>({
		control,
		name,
		rules,
	});
	const value = field.value as ImageSet[] | undefined;

	const filterForAcceptance = useCallback(
		(entries: FullDirEntry[]): FullDirEntry[] =>
			entries.filter((e) => {
				const ext = path.extname(e.name).slice(1).toLowerCase();
				const accepted = e.isFile && imageFileExtensions.includes(ext);
				if (!accepted)
					toast.error(`'${e.name}' is not an acceptable image file`);

				return accepted;
			}),
		[],
	);

	const onDrop = useCallback(
		async (files: string[]) => {
			await onDropHandler(
				value ?? [],
				files,
				filterForAcceptance,
				field.onChange,
			);
		},
		[field, value],
	);

	const selectOneDirectory = useCallback(async () => {
		const selectedDirectory = await open({
			multiple: false,
			directory: true,
			filters: imageFilters,
		});
		if (selectedDirectory) onDrop([selectedDirectory]);
	}, [onDrop]);

	const selectMultipleDirectories = useCallback(async () => {
		const selectedDirectories = await open({
			multiple: true,
			directory: true,
			filters: imageFilters,
		});
		if (selectedDirectories) onDrop(selectedDirectories);
	}, [onDrop]);
	return (
		<Field className={className} data-invalid={fieldState.invalid}>
			<FieldContent className="flex flex-col gap-0 divide-y overflow-y-auto">
				{value?.map((row: ImageSet, index: number) => (
					<ImageSetPreview
						key={index}
						{...row}
						onRemove={() => {
							field.onChange(value?.filter((_, i) => i !== index) ?? []);
						}}
					/>
				))}
				<ContextMenu>
					<ContextMenuTrigger asChild>
						<TauriDropzone
							id="image-matrix-input"
							multiple
							onDrop={onDrop}
							onClick={selectOneDirectory}
						>
							{useCallback(
								({ isDragActive }: DropzoneChildrenProps) => (
									<div
										className={cn(
											"transition-colors border-8 border-dashed text-border h-56 grid place-items-center p-4 cursor-pointer focus:outline-hidden",
											"hover:text-foreground hover:border-foreground",
											// show invalid via group parent from Field as red
											"group-data-[invalid=true]/field:text-destructive",
											{ "text-foreground border-foreground": isDragActive },
										)}
									>
										<div className="grid place-items-center gap-2">
											<ArrowDownOnSquareStackIcon className="size-16" />
											<p>Drag and drop images here</p>
										</div>
									</div>
								),
								[],
							)}
						</TauriDropzone>
					</ContextMenuTrigger>
					<ContextMenuContent className="w-52">
						<ContextMenuItem onClick={selectOneDirectory}>
							Create one...
							{/* <ContextMenuShortcut>⌘[</ContextMenuShortcut> */}
						</ContextMenuItem>
						<ContextMenuItem onClick={selectMultipleDirectories}>
							Create multiple...
							{/* <ContextMenuShortcut>⌘]</ContextMenuShortcut> */}
						</ContextMenuItem>
					</ContextMenuContent>
				</ContextMenu>
			</FieldContent>
			{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
		</Field>
	);
}
