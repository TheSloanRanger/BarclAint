const Joi = require('joi');

const userTransactionSchema = Joi.object({
    UserAccountNumber : Joi.double().required()
})

const userTransactionToSchema = Joi.object({
    CompanyAccountNumber : Joi.string().required(),
    UserAccountNumber : Joi.double().required()
});

const userUpdateBalanceSchema = Joi.object({
    UserAccountNumber : Joi.double().required(),
    BalanceDifference : Joi.number().required()
});

const userAddSchema = Joi.object({
    name : Joi.string().required(),
    age : Joi.string().required(),
    UserBalance : Joi.number().required()
});

module.exports = {
    userTransactionSchema,
    userTransactionToSchema,
    userUpdateBalanceSchema,
    userAddSchema
};