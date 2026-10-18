function isMonitorVisibilityMap(value: unknown): value is Record<string, boolean> {
	return value !== null && typeof value === 'object' && !Array.isArray(value) &&
		Object.values(value).every((visible) => typeof visible === 'boolean');
}

export function parseMonitorVisibility(serializedMap: string): Record<string, boolean> | undefined {
	const parsed: unknown = JSON.parse(serializedMap);
	return isMonitorVisibilityMap(parsed) ? parsed : undefined;
}
