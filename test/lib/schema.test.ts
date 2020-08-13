import {AnyJson} from '@salesforce/ts-types';
import {expect} from 'chai';
import {validateConfig} from '../../src/lib/schema';

const testValidateInvalid = (data: AnyJson) =>
    // tslint:disable-next-line:chai-vague-errors
    expect(validateConfig(data)).not.to.be.undefined;

const testValidateValid = (data: AnyJson) =>
    // tslint:disable-next-line:chai-vague-errors
    expect(validateConfig(data)).to.be.undefined;

describe('config validate', () => {
    it('empty', () => {
        testValidateValid({});
    });

    it('import invalid', () => {
        testValidateInvalid({
            data: {
                sObjects: {
                    import: {
                        deleteBeforeImport: {}
                    }
                }
            }
        });
        testValidateInvalid({
            data: {
                sObjects: {
                    import: {
                        deleteBeforeImport: 'all'
                    }
                }
            }
        });
        testValidateInvalid({
            data: {
                sObjects: {
                    import: false
                }
            }
        });
    });

    it('export invalid', () => {
        testValidateInvalid({
            data: {
                sObjects: {
                    export: {
                        deleteBeforeImport: false
                    }
                }
            }
        });
        testValidateInvalid({
            data: {
                sObjects: {
                    export: []
                }
            }
        });
        testValidateInvalid({
            data: {
                sObjects: {
                    export: false
                }
            }
        });
    });

    it('import valid', () => {
        testValidateValid({
            data: {
                sObjects: {
                    import: {
                        order: []
                    }
                }
            }
        });
        testValidateValid({
            data: {
                sObjects: {
                    import: {
                        order: ['Account', 'Contact']
                    }
                }
            }
        });
        testValidateValid({
            data: {
                sObjects: {
                    import: {
                        order: []
                    }
                }
            }
        });
        testValidateValid({
            data: {
                sObjects: {
                    import: {
                        deleteBeforeImport: false,
                        order: ['Account', 'Contact']
                    }
                }
            }
        });
        testValidateValid({
            data: {
                sObjects: {
                    import: {
                        deleteBeforeImport: 'reversedOrder',
                        order: ['Account', 'Contact']
                    }
                }
            }
        });
        testValidateValid({
            data: {
                sObjects: {
                    import: {
                        deleteBeforeImport: ['Contact', 'Account'],
                        order: ['Account', 'Contact']
                    }
                }
            }
        });
    });

    it('export valid', () => {
        testValidateValid({
            data: {
                sObjects: {
                    export: {}
                }
            }
        });
        testValidateValid({
            data: {
                sObjects: {
                    export: {
                        order: ['Account', 'Contact']
                    }
                }
            }
        });
        testValidateValid({
            data: {
                sObjects: {
                    export: {
                        order: []
                    }
                }
            }
        });
    });
});
