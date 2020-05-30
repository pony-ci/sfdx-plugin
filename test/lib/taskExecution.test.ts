import {Dictionary} from '@salesforce/ts-types';
import {expect, should, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {Environment, prepareCommandArgs} from '../../src/lib/jobs';

should();
use(chaiAsPromised);

function createEnv(variables: Dictionary<string>): Environment {
    const env = Environment.create();
    for (const [key, value] of Object.entries(variables)) {
        env.setEnv(key, value);
    }
    return env;
}

// tslint:disable:no-invalid-template-strings
describe('prepareCommandArgs', () => {
    it('sfdx object properties', () => {
        expect(prepareCommandArgs('$env.some', createEnv({some: 'abc'}))).to.eq('abc');
        expect(prepareCommandArgs('  $env.some', createEnv({some: 'abc'}))).to.eq('  abc');
        expect(prepareCommandArgs('$env.some  ', createEnv({some: 'abc'}))).to.eq('abc  ');
        expect(prepareCommandArgs(' $env.some ', createEnv({some: 'abc'}))).to.eq(' abc ');
        expect(prepareCommandArgs('  $env.some  ', createEnv({some: 'abc'}))).to.eq('  abc  ');
        expect(prepareCommandArgs('aaaa $env.some aaaa', createEnv({some: 'abc'}))).to.eq('aaaa abc aaaa');
        expect(prepareCommandArgs('some $env.some some', createEnv({some: 'abc'}))).to.eq('some abc some');

        expect(prepareCommandArgs('${env.some}', createEnv({some: 'abc'}))).to.eq('abc');
        expect(prepareCommandArgs('  ${env.some}', createEnv({some: 'abc'}))).to.eq('  abc');
        expect(prepareCommandArgs('${env.some}  ', createEnv({some: 'abc'}))).to.eq('abc  ');
        expect(prepareCommandArgs(' ${env.some} ', createEnv({some: 'abc'}))).to.eq(' abc ');
        expect(prepareCommandArgs('  ${env.some}  ', createEnv({some: 'abc'}))).to.eq('  abc  ');
        expect(prepareCommandArgs('aaaa ${env.some} aaaa', createEnv({some: 'abc'}))).to.eq('aaaa abc aaaa');
        expect(prepareCommandArgs('some ${env.some} some', createEnv({some: 'abc'}))).to.eq('some abc some');

        expect(prepareCommandArgs('some $env.some $env.other some', createEnv({some: 'abc', other: 'xyz'})))
            .to.eq('some abc xyz some');
        expect(prepareCommandArgs('some "$env.some" $env.other some', createEnv({some: 'abc', other: 'xyz'})))
            .to.eq('some "abc" xyz some');
        expect(prepareCommandArgs('some "$env.some" "$env.other" some', createEnv({some: 'abc', other: 'xyz'})))
            .to.eq('some "abc" "xyz" some');
        expect(prepareCommandArgs('some "$env.some $env.other" some', createEnv({some: 'abc', other: 'xyz'})))
            .to.eq('some "abc xyz" some');
        expect(prepareCommandArgs('"some $env.some $env.other" some', createEnv({some: 'abc', other: 'xyz'})))
            .to.eq('"some abc xyz" some');
        expect(prepareCommandArgs('"some $env.some ${env.other}aaa" some', createEnv({some: 'abc', other: 'xyz'})))
            .to.eq('"some abc xyzaaa" some');
        expect(prepareCommandArgs('some "${env.some}" $env.other some', createEnv({some: 'abc', other: 'xyz'})))
            .to.eq('some "abc" xyz some');

        expect(prepareCommandArgs('$env.someaaa', createEnv({some: 'abc'}))).to.eq('');

        expect(prepareCommandArgs('sfdx force:org:create -u $env.username -v $env.devhub_username',
            createEnv({username: 'abc', devhub_username: 'dh'})))
            .to.eq('sfdx force:org:create -u abc -v dh');
        expect(prepareCommandArgs('sfdx force:org:create -u $env.username -v $env.devhub_username',
            createEnv({username: 'abc', devhub_username: undefined})))
            .to.eq('sfdx force:org:create -u abc -v ');
        expect(prepareCommandArgs('sfdx force:org:create -u "$env.username" -v "$env.devhub_username"',
            createEnv({username: 'abc'})))
            .to.eq('sfdx force:org:create -u "abc" -v ""');
    });
});
