import React, { useState, useRef, useEffect } from 'react';
import PropTypes from "prop-types";
import {ScribblePad} from "../../Components/HandNotes/ScribblePad";
import {I18nProvider} from "../../Components/i18n/I18nProvider";

export function HandNotes(props) {
  const [showScribblePad, setShowScribblePad] = useState(false);
  const {hostData} = props;
  const {patient, imageNoteConceptName, handnoteConceptName, locationUuid, encounterTypeUuid, observationMapper, onSaveSuccess, saveObs} = hostData;
  const openScribblePad = async () => {
    setShowScribblePad(true);
  }

  const closeScribblePad = async () => {
    setShowScribblePad(false);
  }
    return (
        <I18nProvider>
            <div class="button-wrapper">
                <button type="button" onClick={()=>{openScribblePad()}}>S</button>
            </div>
            {showScribblePad ? (
                <ScribblePad
                    closeScribblePad={closeScribblePad}
                    patient={patient}
                    handnoteConceptName={handnoteConceptName}
                    saveObs={saveObs}
                    imageNoteConceptName={imageNoteConceptName}
                    locationUuid={locationUuid}
                    encounterTypeUuid={encounterTypeUuid}
                    observationMapper={observationMapper}
                    onSaveSuccess={onSaveSuccess}
                />
              ) : null}

        </I18nProvider>
    );
}
HandNotes.propTypes = {
    hostData: PropTypes.Object,
}