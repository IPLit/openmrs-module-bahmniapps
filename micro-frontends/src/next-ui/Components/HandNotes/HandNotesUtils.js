import axios from 'axios';
import { SAVE_DOCUMENT_URL, CONCEPT_SET_URL, BAHMNI_DISTRO_ENCOUNTER_URL } from "../../constants";

export const saveDocument = async (payload) => {
    try {
        return await axios.post(SAVE_DOCUMENT_URL, payload, {
          withCredentials: true,
          headers: { Accept: "application/json", "Content-Type": "application/json" },
        });
    } catch (error) {
        console.log(error);
        return error;
    }
};

export const saveEncounter = async (imageUrl, handNoteConceptName, imageNoteConceptName) => {
    let handNoteResponse = await getConceptByName(handNoteConceptName);
    let imageNoteResponse = await getConceptByName(imageNoteConceptName);

 }

const getConceptByName = async (conceptName) => {
    try {
        return await axios.get(CONCEPT_SET_URL, {params: {name: conceptName, v: "bahmni"}});
    } catch (error) {
        console.log(error);
        return error;
    }
}