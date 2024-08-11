import axios from 'axios';
import { SAVE_DOCUMENT_URL } from "../../constants";

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