import React from "react";
import PropTypes from "prop-types";
import {ScribblePad} from "../../Components/HandNotes/ScribblePad";
import {I18nProvider} from "../../Components/i18n/I18nProvider";

export function HandNotes(props) {
    return (
        <I18nProvider>
            <ScribblePad {...props}/>
        </I18nProvider>
    );
}
HandNotes.propTypes = {
    hostData: PropTypes.object,
}