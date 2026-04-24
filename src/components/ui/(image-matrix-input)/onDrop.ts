import { ImageSet } from "../image-set-preview";
import { stat } from "@tauri-apps/plugin-fs";
import path from "path";
import { readDir } from "@tauri-apps/plugin-fs";
import { FullDirEntry } from "./image-matrix-input";

export async function onDrop(
	currentValues: ImageSet[],
	files: string[],
	filterForAcceptance: (entries: FullDirEntry[]) => FullDirEntry[],
	onChange: (value: ImageSet[]) => void,
) {
	if (!files.length) return;

	// group by top-level directory name (first segment of path)
	const groups = new Map<string, ImageSet>();
	for (const rawPath of files) {
		console.log("rawPath", rawPath);
		const fileStats = await stat(rawPath);
		const { isFile } = fileStats;
		const fileDir = isFile ? path.dirname(rawPath) : rawPath;
		const groupingDir = path.basename(fileDir);

		const arr = groups.get(groupingDir) ?? {
			name: groupingDir,
			files: [],
		};
		let pendingEntries: FullDirEntry[] = [];
		if (isFile) {
			pendingEntries = [
				{ ...fileStats, name: path.basename(rawPath), path: rawPath },
			];
		} else {
			pendingEntries = (await readDir(rawPath)).map((e) => ({
				...e,
				path: path.join(rawPath, e.name),
			}));
		}
		arr.files.push(...filterForAcceptance(pendingEntries).map((e) => e.path));
		groups.set(groupingDir, arr);
	}

	const newRows = Array.from(groups.values());
	// todo: sort these by total alpha value, so we can see the images sorted from most exposed to least exposed
	onChange([...currentValues, ...newRows]);
}
