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

const companyAddSchema = Joi.object({
    'Company Name': Joi.string().required(),
    'Spending Category': Joi.string().required(),
    'Carbon Emissions': Joi.string().required(),
    'Waste Management': Joi.string().required(),
    'Sustainability Practices': Joi.string().required(),
    'Summary': Joi.string().required()
})

const rewardAddSchema = Joi.object({
    'Company': Joi.string().required(),
    'VoucherAmount' : Joi.number().required(),
    'Description': Joi.string().required(),
    'Awardable': Joi.boolean().required()
})



const getCompanySchema = Joi.object({
    'Account Number': Joi.string().required()
})

const filterByDateSchema = Joi.object({
    userAccountNumber: Joi.number().required(),
    startDate: Joi.string().required(),
    endDate: Joi.string().required()
})

module.exports = {
    userTransactionSchema,
    userTransactionToSchema,
    userUpdateBalanceSchema,
    UserFindSchema,
    userAddSchema,
    companyAddSchema,
    getCompanySchema,
    filterByDateSchema,
    rewardAddSchema
};