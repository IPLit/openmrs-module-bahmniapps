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

export const saveEncounter = async (imageUrl, handNoteConceptName, imageNoteConceptName, observationMapper, encounter) => {
    let handNoteResponse = await getConceptByName(handNoteConceptName);
    let handNotes = observationMapper.map(imageUrl, handNoteResponse.data.results[0], {});
    handNotes.groupMembers.map(gm => {
        if (gm.concept.name === imageNoteConceptName) {
           gm.value = imageUrl;
           gm.valueAsString = imageUrl;
        }
        return gm;
    })
    handNotes.value = imageUrl;
    stripExtraConceptInfo(handNotes);
    encounter.observations = [handNotes];
    try {
        return await axios.post(BAHMNI_DISTRO_ENCOUNTER_URL, encounter, {
            withCredentials: true,
            headers: { Accept: "application/json", "Content-Type": "application/json" }
        });
    } catch (error) {
        console.log(error);
        return error;
    }
 };
const stripExtraConceptInfo = function (obs) {
    obs.concept = {uuid: obs.concept.uuid, name: obs.concept.name, dataType: obs.concept.dataType};
    obs.groupMembers = obs.groupMembers || [];
    obs.groupMembers.forEach(function (groupMember) {
        stripExtraConceptInfo(groupMember);
    });
};

const getConceptByName = async (conceptName) => {
    try {
        return await axios.get(CONCEPT_SET_URL, {params: {name: conceptName, v: "bahmni"}});
    } catch (error) {
        console.log(error);
        return error;
    }
}