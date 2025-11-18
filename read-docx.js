const mammoth = require('mammoth');

mammoth.extractRawText({path: 'Time Card (Admin).docx'})
    .then(result => {
        console.log(result.value);
    })
    .catch(err => {
        console.error(err);
    });
