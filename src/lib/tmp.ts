import * as _tmp from 'tmp-promise';

let init = false;

if (!init) {
    _tmp.setGracefulCleanup();
    init = true;
}

export const tmp = _tmp;