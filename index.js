const CSS_BASE_URL = "https://cebupacificair-dev.apigee.net/ceb-poc-css-api";

let results_arr = [];

const form = document.getElementById("formFileData");
const fileData = document.getElementById('fileData');
const btn_upload = document.getElementById('uploadFileData');
const results_container = document.getElementById('results_container');
const alert_box = document.getElementById('alert_box');

const CSS = {
    getAccessToken: async () => {
        return await fetch('https://cebupacificair-dev.apigee.net/ceb-poc-css-api/css/get-token', {
            method: 'POST'
        });
    },
    scanFile: async (access_token, fileName) => {
        return await fetch('https://cebupacificair-dev.apigee.net/ceb-poc-css-api/api/Scan', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${access_token}` },
            body: fileName
        });
    }
}

fileData.addEventListener('click', e => {
    btn_upload.disabled = true;
    fileData.value = "";
    results_container.innerHTML = "";
    hideAlert();
});

fileData.addEventListener('change', e => {
    if (e.target.files.length > 0) {
        btn_upload.disabled = false;
    }
});


form.addEventListener("submit", submitForm);

function submitForm(e) {
    e.preventDefault();

    btn_upload.disabled = true;

    const files = document.getElementById("fileData");
    const formData = new FormData();

    for (let i =0; i < files.files.length; i++) {
        formData.append("files", files.files[i]);
    }

    console.log('files', files.files[0]);
    let uploadFileReader = new FileReader();
    console.log(uploadFileReader)
    var fileInfo = files.files[0].arrayBuffer();
    console.log('fileInfo', fileInfo)
    uploadFileReader.readAsArrayBuffer(files.files[0])
    uploadFileReader.onload = async function () {
        const uploadedFileName = files.files[0].name;
        const uploadedFileType = files.files[0].type;    
        const CSS_API_OPTION_1 = { method: 'POST' };

        fetch(CSS_BASE_URL + "/css/get-token", CSS_API_OPTION_1)
            .then((response) => ({ status: response.status, body: response.json() }))
            .then(async (res1) => {
                let response1 = await res1.body;

                if (res1.status === 200 && !response1.fault) {
                    let accessToken = response1.accessToken;
                    const CSS_API_OPTION_2 = {
                        method: 'POST',
                        headers: { "Authorization": `Bearer ${accessToken}` },
                        body: formData
                    };

                    console.log('form data', JSON.stringify({'e': e, 'formData': formData}));
                    fetch(CSS_BASE_URL + "/api/Scan", CSS_API_OPTION_2)
                        .then((response) => ({ status: response.status, body: response.json() }))
                        .then(async (res2) => {
                            let response2 = await res2.body;

                            if (res2.status === 200 && !response2.fault) {                            
                                if (response2.result === "Clean" && response2.detectedInfections.length < 1) {
                                    const CSS_API_OPTION_3 = { method: 'POST' };
                                    console.log('clean!')
                                    fetch(CSS_BASE_URL + '/uamp/get-ceb-token', CSS_API_OPTION_3)
                                        .then((response) => ({ status: response.status, body: response.json() }))
                                        .then(async (res3) => {
                                            let response3 = await res3.body;
                        
                                            if (res3.status === 200 && !response3.fault) {
                                                let accessToken = response3.accessToken.accessToken;
                        
                                                const CSS_API_OPTION_4 = { method: 'POST', body: accessToken };

                                                fetch(CSS_BASE_URL + '/uamp/login', CSS_API_OPTION_4)
                                                    .then((response) => ({ status: response.status, body: response.json() }))
                                                    .then(async (res4) => {
                                                        let response4 = await res4.body;

                                                        if (res4.status === 200 && !response4.fault) {
                                                            const CSS_API_OPTION_5 = { method: 'POST', headers: { Authorization: "Bearer " + accessToken, "Content-Type": uploadedFileType }, body: uploadFileReader.result};

                                                            fetch("https://test-soar.cebupacificair.com/ceb-passengeruamp/v1/cebampdev/upload?fileName=" + uploadedFileName, CSS_API_OPTION_5)
                                                                .then((response) => ({ status: response.status, body: response }))
                                                                .then(async (res5) => {
                                                                    let response5 = await res5.body;

                                                                    if (res5.status === 200) {
                                                                        showSuccessAlert();
                                                                        displayResults(response2);
                                                                        btn_upload.disabled = false;
                                                                    } else {
                                                                        displayServerError400();
                                                                    }
                                                                })
                                                                .catch((err) => {
                                                                    displayServerError400();
                                                                    console.error("Error occured", err);
                                                                });
                                                        } else {
                                                            displayServerError400();
                                                        }
                                                    });
                                            } else {
                                                displayServerError400();
                                            }
                                        })
                                        .catch((err) => {
                                            displayServerError400();
                                            console.error("Error occured", err);
                                        });
                                } else if (response2.detectedInfections.length > 1) {
                                    showErrorAlert("File you tried to upload is infected. Please try again");
                                    displayResults(response2);
                                    btn_upload.disabled = false;
                                } else {
                                    displayServerError400();
                                    btn_upload.disabled = false;
                                }
                            } else {
                                displayServerError400();
                            }
                        })
                        .catch((err) => {
                            let errMesage = files.files.length > 0 ? 'Something went wrong. please try again' : 'Please choose a file from your computer'; 

                            displayServerError(errMesage);
                            console.error("Error occured", err);
                        });
                } else {
                    displayServerError400();
                }
            })
            .catch((err) => {
                displayServerError400();
                console.error("Error occured", err);
            });
    }
}

function displayServerError400 () {
    let errMesage = 'Something went wrong. please try again'; 
    displayServerError(errMesage);
}

function displayServerError (errMesage) {
    showErrorAlert(errMesage);
    btn_upload.disabled = false;
}

function displayResults (resp) {
    let result = `File is <b>${resp.result}</b>`;
    let trueFileType = `The True File Type is ${resp.trueFileType}`;
    let detectedInfections = resp.detectedInfections.length > 0 ? resp.detectedInfections.map(r => (`${r.engine} engine v${r.engineVersion} virusDbVersion ${r.virusDbVersion}: ${r.file} - ${r.infection}`)).join('<br>') : 'No infected findings for the file';
    let resultsPerEngine = resp.results.length > 0 ? resp.results.map(r => (`${r.engine} engine v${r.engineVersion}: ${r.file} - ${r.result}`)).join('<br>') : 'No scan results found';
    let scannedDate = `${moment(new Date(resp.dateScanned)).format('MM-DD-YYYY h:mm:ss a')}`;

    results_container.innerHTML = `${result}<br>${scannedDate}<br>${detectedInfections}<br>${resultsPerEngine}<br>${trueFileType}`;
}

function showSuccessAlert () {
    alert_box.style.display = 'block';
    alert_box.classList.remove('alert-success');
    alert_box.classList.add('alert-success');
    alert_box.innerHTML = '<strong>Success!</strong> Your clean file is uploaded successfully';
}

function showErrorAlert (errMessage) {
    alert_box.style.display = 'block';
    alert_box.classList.remove('alert-danger');
    alert_box.classList.add('alert-danger');
    alert_box.innerHTML = '<strong>Error!</strong> ' + errMessage;
}

function hideAlert () {
    alert_box.style.display = 'none';
    alert_box.classList.remove('alert-danger');
    alert_box.classList.remove('alert-success');
    alert_box.innerHTML = '';
}