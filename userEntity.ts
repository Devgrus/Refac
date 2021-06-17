export interface UserInfo {
	email: string;
	password: string;
	username: string;
	fromBo: boolean;
	roles: string;
	isActive: boolean;
	activationToken: any;
	country: string;
	_id: number;
	mangoPayUserId: string;
	cagnotteId: string;
}

export interface Require {
	body: UserInfo;
}
