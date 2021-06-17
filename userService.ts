import { UserInfo } from './userEntity';

let sails: any;
let jwToken: any;
let AuthService: any;
let MailService: any;
let PaymentService: any;

export function userInfoValidator(body: any, userInfo: string[]) {
	const errors: string[] = [];
	for (let value of userInfo) {
		if (!body.value) {
			errors.push('error_missing_' + value);
		}
	}
	if (errors.length > 0) {
		throw errorMessage(400, errors);
	}
}

export function errorMessage(errCode: number, errMessage: string | string[]) {
	return new Error(`Error ${errCode} : ${errMessage}`);
}

export class ConfigUser {
	public data: UserInfo;
	constructor(user: UserInfo) {
		this.data = {
			...user,
			email: user.email.toLowerCase(),
			username: user.username.toLowerCase(),
		};
	}

	findCurrentUser = () => {
		return sails.models.user.em.findOne({
			where: {
				email: this.data.email,
			},
		});
	};

	setRoles = (data: Partial<UserInfo>) => {
		this.data = {
			...this.data,
			...data,
		};
	};

	unifiedUpdateUser = (unifiedUser: UserInfo) => {
		sails.models.user.em.unifiedUpdate(
			{
				_id: unifiedUser._id,
			},
			this.data,
		);
		sails.models.user.em.findOne({
			where: {
				email: unifiedUser.email,
			},
		});
	};

	AuthServiceProcess = () => {
		const authInfo = AuthService.beforeCreate(this.data);
		if (authInfo) {
			return sails.models.user.em.create(this.data, {
				raw: true,
			});
		}
		throw new Error('password_encoding_error');
	};

	generateToken = () => {
		if (this.data.roles && typeof this.data.roles === 'string') {
			try {
				this.data.roles = JSON.parse(this.data.roles);
			} catch (e) {
				sails.tracer.warn(e);
			}
		}
		const token = jwToken.generateFor(this.data);
		if (this.data.activationToken) {
			delete this.data.activationToken;
		}
		sails.models.user.em.update(this.data, {
			where: {
				_id: this.data._id,
			},
		});
		this.emailSendConfirmation();
		return token;
	};
	emailSendConfirmation = () => {
		if (
			this.data &&
			this.data._id &&
			sails.config.enyo.user.emailConfirmationRequired
		) {
			return MailService.sendEmailConfirmation(this.data);
		}
		return true;
	};
	configMangoUserId = () => {
		const mangoPaytest =
			sails.config.environment === 'test'
				? 111111
				: PaymentService.getMangoPayUserId(this.data);
		const mangoUser = sails.models.user.em.update(
			{
				mangoPaytest,
			},
			{
				where: {
					_id: this.data._id,
				},
			},
		);
		sails.models.cagnotte.em.create(
			{
				amount: 0,
				userId: this.data._id,
			},
			{
				raw: true,
			},
		);

		if (mangoUser && mangoUser.dataValues) {
			this.data.cagnotteId = mangoUser.dataValues._id;
			return sails.models.user.em.update(
				{
					cagnotteId: mangoUser.dataValues._id,
				},
				{
					where: {
						_id: this.data._id,
					},
				},
			);
		}
		throw new Error('error_cagnotte_creation');
	};
	mailSendUserCreated = () => {
		MailService.sendUserCreated(this.data.email, {
			user: this.data,
		});
	};
}
