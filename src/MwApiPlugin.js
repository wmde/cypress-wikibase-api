/**
 * Helper methods for generic MediaWiki API functionality separate from the Cypress browser context
 */
'use strict';

// needed for api-testing library, see api-testing/lib/config.js
process.env.REST_BASE_URL = process.env.MW_SERVER + process.env.MW_SCRIPT_PATH + '/';

const ApiTesting = require( 'api-testing' );
const { clientFactory, utils } = ApiTesting;

const state = {
	users: {
		root: null,
		bot: null
	},
	tokens: {
		botToken: null
	}
};

module.exports = {
	mwApiCommands( cypressConfig ) {
		async function root( withCache = true ) {
			if ( state.users.root && withCache ) {
				return state.users.root;
			}
			const rootClient = clientFactory.getActionClient( null );
			await rootClient.login(
				cypressConfig.mediawikiAdminUsername,
				cypressConfig.mediawikiAdminPassword
			);
			await rootClient.loadTokens( [ 'createaccount', 'userrights', 'csrf' ] );

			const rightsToken = await rootClient.token( 'userrights' );
			if ( rightsToken === '+\\' ) {
				throw new Error( 'Failed to get the root user tokens.' );
			}

			if ( withCache ) {
				state.users.root = rootClient;
			}
			return rootClient;
		}

		async function botUser() {
			if ( state.users.bot ) {
				return state.users.bot;
			}
			const name = utils.title( 'r2d2' );
			const password = utils.title( 'very-secret-' );

			const rootUser = await root( false );
			await rootUser.createAccount( { username: name, password } );
			await rootUser.addGroups( name, [ 'bot' ] );

			await rootUser.login( name, password );

			state.users.bot = rootUser;

			return rootUser;
		}

		async function getBotEditToken( bot ) {
			if ( state.tokens.botToken ) {
				return state.tokens.botToken;
			}
			const token = await bot.request( {
				action: 'query',
				meta: 'tokens',
				type: 'csrf'
			} ).then( ( response ) => {
				if ( response.body.query && response.body.query.tokens && response.body.query.tokens.csrftoken ) {
					return response.body.query.tokens.csrftoken;
				} else {
					const err = new Error( 'Could not get edit token' );
					err.response = response;
					throw err;
				}
			} );

			state.tokens.botToken = token;

			return token;
		}

		async function createEntity( entityType, label, data ) {
			const itemData = {};
			let labels = {};

			if ( typeof label === 'object' ) {
				labels = label;
			} else if ( label ) {
				labels = {
					en: {
						language: 'en',
						value: label
					}
				};
			}

			Object.assign( itemData, { labels }, data );

			const bot = await botUser();
			const botToken = await getBotEditToken( bot );

			const response = await bot.request( {
				action: 'wbeditentity',
				new: entityType,
				data: JSON.stringify( itemData ),
				token: botToken
			}, true );
			return response.body.entity.id;
		}

		async function createProperty( datatype, label, data ) {
			const propertyData = {};
			let labels = {};

			if ( typeof label === 'object' ) {
				labels = label;
			} else if ( label ) {
				labels = {
					en: {
						language: 'en',
						value: label
					}
				};
			}

			Object.assign( propertyData, { datatype, labels }, data );

			const rootClient = await root();
			const response = await rootClient.action( 'wbeditentity', {
				new: 'property',
				data: JSON.stringify( propertyData ),
				token: await rootClient.token()
			}, 'POST' );
			return response.entity.id;
		}

		return {
			async 'MwApi:BlockUser'( { username, reason, expiry } ) {
				const rootClient = await root();
				const blockResult = await rootClient.action( 'block', {
					user: username,
					assert: 'user',
					reason: reason || 'Set up blocked user',
					expiry: expiry || 'never',
					token: await rootClient.token()
				}, 'POST' );

				if ( !blockResult.block ) {
					return Promise.reject( new Error( 'Failed to block user.' ) );
				}

				return Promise.resolve( null );
			},
			async 'MwApi:CreateUser'( { usernamePrefix } ) {
				const rootUser = await root();
				const username = utils.title( usernamePrefix + '-' );
				const password = utils.uniq();
				await rootUser.createAccount( { username: username, password: password } );

				return Promise.resolve( { username, password } );
			},
			async 'MwApi:CreateItem'( { label, data } ) {
				return createEntity( 'item', label, data );
			},
			async 'MwApi:CreateEntity'( { entityType, label, data } ) {
				return createEntity( entityType, label, data );
			},
			async 'MwApi:CreateProperty'( { datatype, label, data } ) {
				return createProperty( datatype, label, data );
			},
			async 'MwApi:GetOrCreatePropertyIdByDataType'( { datatype } ) {
				if ( !( 'wikibasePropertyIds' in cypressConfig ) ) {
					cypressConfig.wikibasePropertyIds = {};
				}
				if ( cypressConfig.wikibasePropertyIds[ datatype ] ) {
					return Promise.resolve( cypressConfig.wikibasePropertyIds[ datatype ] );
				} else {
					return createProperty( datatype, utils.title( datatype ) )
						.then( ( propertyId ) => {
							cypressConfig.wikibasePropertyIds[ datatype ] = propertyId;
							return propertyId;
						} );
				}
			},
			async 'MwApi:GetEntityData'( { entityId } ) {
				const bot = await botUser();

				return bot.request( {
					action: 'wbgetentities',
					ids: entityId
				} ).then( ( response ) => response.body.entities[ entityId ] );
			},
			async 'MwApi:UnblockUser'( { username, reason } ) {
				const rootClient = await root();
				const unblockResult = await rootClient.action( 'unblock', {
					user: username,
					assert: 'user',
					reason: reason || 'Unblocked user',
					token: await rootClient.token()
				}, 'POST' );

				if ( !unblockResult.unblock ) {
					return Promise.reject( new Error( 'Failed to unblock user.' ) );
				}

				return Promise.resolve( null );
			},
			async 'MwApi:BotRequest'( { isEdit, isPost, parameters } ) {
				const bot = await botUser();
				const requestParams = Object.assign( {}, parameters );
				if ( isEdit ) {
					const botToken = await getBotEditToken( bot );
					requestParams.token = botToken;
				}
				return bot.request( requestParams, isPost ).then( ( response ) => response.body );
			}
		};
	}
};
