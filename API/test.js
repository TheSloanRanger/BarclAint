const expect = require('chai');
const request = 
const chaiHttp = await import('chai-http');
const { default: app } = await import('../server.js');
const { expect } = chai;

chai.use(chaiHttp);

describe('API Endpoints', () => {
    it('should return all companies with only name and account number', (done) => {
        chai.request(app)
            .get('/api/companies/lazy_load_company')
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.be.an('object');
                expect(res.body.lazy_load_company).to.be.an('array');
                res.body.lazy_load_company.forEach(company => {
                    expect(company).to.have.property('CompanyName');
                    expect(company).to.have.property('AccountNumber');
                });
                done();
            });
        });
});