/**
 * @import { KikuPlugin } from "#/plugins/plugin-types";
 */

/**
 * @type { KikuPlugin }
 */
export const plugin = {
  Sentence: (props) => {
    const h = props.ctx.h;
    const { ankiFields } = props.ctx;

    function MiscInfo() {
      if (!ankiFields.MiscInfo) return null;
      return h("div", {
        class: `bg-base-200 p-2 rounded-lg animate-fade-in misc-info text-base-content-calm`,
        innerHTML: ankiFields.MiscInfo,
      })();
    }

    return [props.DefaultSentence(), MiscInfo()];
  },

  Footer: (props) => {
    const h = props.ctx.h;
    const DefaultFooter = props.DefaultFooter;

    function Footer() {
      return h("div", { class: `custom-footer` }, DefaultFooter())();
    }

    function Style() {
      return h(
        "style",
        `
        .custom-footer { 
          .misc-info { 
            display: none; 
          } 
        }
      `,
      )();
    }

    return [Footer(), Style()];
  },
};
