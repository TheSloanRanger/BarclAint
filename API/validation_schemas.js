const Joi = require('joi');

const userTransactionSchema = Joi.object({
    UserAccountNumber : Joi.number().required()
})

const userTransactionToSchema = Joi.object({
    CompanyAccountNumber : Joi.string().required(),
    UserAccountNumber : Joi.number().required()
});

const userUpdateBalanceSchema = Joi.object({
    UserAccountNumber : Joi.number().required(),
    BalanceDifference : Joi.number().required()
});

const userAddSchema = Joi.object({
    name : Joi.string().required(),
    age : Joi.string().required(),
    UserBalance : Joi.number().required()
});

const UserFindSchema = Joi.object({
    UserAccountNumber : Joi.number().required()
});

module.exports = {
    userTransactionSchema,
    userTransactionToSchema,
    userUpdateBalanceSchema,
    UserFindSchema,
    userAddSchema
};