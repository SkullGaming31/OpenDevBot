import { createSqliteModel } from '../sqliteModel';

export interface IDashboardMonitorSettings {
	bitsThreshold: number;
	totalMax: number;
	perEventMax: Record<string, number>;
	perEventVisible: Record<string, boolean>;
}

export interface IDashboardSettings {
	_id?: string;
	monitor?: IDashboardMonitorSettings;
	createdAt?: Date;
	updatedAt?: Date;
}

export default createSqliteModel<IDashboardSettings>('DashboardSettings', { timestamps: true });
