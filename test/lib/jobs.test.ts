import {Logger} from '@salesforce/core';
import {Dictionary} from '@salesforce/ts-types';
import {expect, should, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {registerLogger} from '../../src';
import {Environment} from '../../src/lib/jobs';

should();
use(chaiAsPromised);

before(() => {
    registerLogger(new Logger('testLogger'));
});

function createEnv(variables: Dictionary<string>): Environment {
    const env = Environment.createDefault();
    for (const [key, value] of Object.entries(variables)) {
        env.setEnv(key, value);
    }
    return env;
}

// tslint:disable:no-invalid-template-strings
describe('fillString', () => {
    it('sfdx object properties', () => {
        expect(createEnv({some: 'abc'}).fillString('$env.some')).to.eq('abc');
        expect(createEnv({some: 'abc'}).fillString('  $env.some')).to.eq('  abc');
        expect(createEnv({some: 'abc'}).fillString('$env.some  ')).to.eq('abc  ');
        expect(createEnv({some: 'abc'}).fillString(' $env.some ')).to.eq(' abc ');
        expect(createEnv({some: 'abc'}).fillString('  $env.some  ')).to.eq('  abc  ');
        expect(createEnv({some: 'abc'}).fillString('aaaa $env.some aaaa')).to.eq('aaaa abc aaaa');
        expect(createEnv({some: 'abc'}).fillString('some $env.some some')).to.eq('some abc some');

        expect(createEnv({some: 'abc'}).fillString('${env.some}')).to.eq('abc');
        expect(createEnv({some: 'abc'}).fillString('  ${env.some}')).to.eq('  abc');
        expect(createEnv({some: 'abc'}).fillString('${env.some}  ')).to.eq('abc  ');
        expect(createEnv({some: 'abc'}).fillString(' ${env.some} ')).to.eq(' abc ');
        expect(createEnv({some: 'abc'}).fillString('  ${env.some}  ')).to.eq('  abc  ');
        expect(createEnv({some: 'abc'}).fillString('aaaa ${env.some} aaaa')).to.eq('aaaa abc aaaa');
        expect(createEnv({some: 'abc'}).fillString('some ${env.some} some')).to.eq('some abc some');

        expect(createEnv({some: 'abc', other: 'xyz'}).fillString('some $env.some $env.other some'))
            .to.eq('some abc xyz some');
        expect(createEnv({some: 'abc', other: 'xyz'}).fillString('some "$env.some" $env.other some'))
            .to.eq('some "abc" xyz some');
        expect(createEnv({some: 'abc', other: 'xyz'}).fillString('some "$env.some" "$env.other" some'))
            .to.eq('some "abc" "xyz" some');
        expect(createEnv({some: 'abc', other: 'xyz'}).fillString('some "$env.some $env.other" some'))
            .to.eq('some "abc xyz" some');
        expect(createEnv({some: 'abc', other: 'xyz'}).fillString('"some $env.some $env.other" some'))
            .to.eq('"some abc xyz" some');
        expect(createEnv({some: 'abc', other: 'xyz'}).fillString('"some $env.some ${env.other}aaa" some'))
            .to.eq('"some abc xyzaaa" some');
        expect(createEnv({some: 'abc', other: 'xyz'}).fillString('some "${env.some}" $env.other some'))
            .to.eq('some "abc" xyz some');

        expect(createEnv({some: 'abc'}).fillString('$env.someaaa')).to.eq('');

        expect(createEnv({username: 'abc', devhub_username: 'dh'})
            .fillString('sfdx force:org:create -u $env.username -v $env.devhub_username'))
            .to.eq('sfdx force:org:create -u abc -v dh');
        expect(createEnv({username: 'abc', devhub_username: undefined})
            .fillString('sfdx force:org:create -u $env.username -v $env.devhub_username'))
            .to.eq('sfdx force:org:create -u abc -v ');
        expect(createEnv({username: 'abc'})
            .fillString('sfdx force:org:create -u "$env.username" -v "$env.devhub_username"'))
            .to.eq('sfdx force:org:create -u "abc" -v ""');
    });
});
