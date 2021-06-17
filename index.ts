import { Require } from './userEntity';
import { userInfoValidator, errorMessage, ConfigUser } from './userService';

let sails: any;
let jwToken: any;
let ResponseTransformer: any;
let Tools: any;

const create = async (req: Require, res: any) => {
	try {
		let token: any;
		userInfoValidator(req.body, ['email', 'password']);
		if (!req.body.username) {
			if (sails.config.enyo.user.username) {
				throw errorMessage(400, 'error_missing_username');
			}
			req.body.username = req.body.email;
		}
		const User = new ConfigUser(req.body);

		const currentUser = await User.findCurrentUser();
		if (currentUser) {
			if (req.body.fromBo === true) {
				throw errorMessage(400, 'user_already_exists');
			}
			User.setRoles({
				roles: JSON.stringify(['USER']),
				isActive: true,
			});
			if (!currentUser.country) {
				currentUser.country = 'France';
			}
			const updatedUser = await User.unifiedUpdateUser(currentUser);
			token = jwToken.generateFor(updatedUser);
			res.status(200).json({
				user: ResponseTransformer.user(updatedUser),
				token,
				update: true,
			});
		}

		if (!User.data.roles) {
			currentUser.roles = JSON.stringify(['USER']);
		}

		await User.AuthServiceProcess();

		token = await User.generateToken();

		await User.configMangoUserId();

		if (currentUser._id) {
			await User.mailSendUserCreated();
			res.status(200).json({
				user: ResponseTransformer.user(currentUser),
				token,
			});
		} else {
			throw errorMessage(503, 'user_not_saved');
		}
	} catch (err) {
		sails.tracer.warn(err && err.message ? err.message : err);
		Tools.errorCallback(err, res);
	}
};
