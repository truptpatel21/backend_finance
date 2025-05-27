const Utility = require('./common');
const data = "nodenextapikey123";
const encrypted = Utility.encrypt({
    "quote_id": "1",
    "is_like": 0
});
console.log('Encrypted:', encrypted);


const des ="LHYr888teqiDhiHka5eOwLX+s75Tw2IFKN2ZH9SbvuBiS875vafTNHWJ7oZ/NdWnVAgvoaIsaCJpyTnPaeF1Kg=="
const decrypted = Utility.decryptPlain(des);
console.log('Decrypted:', decrypted);

