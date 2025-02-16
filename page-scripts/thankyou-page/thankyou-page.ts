import type {
  ConversionsType,
  LanguageCodes,
  SovConsumerType,
  SovendusAppSettings,
  SovendusThankYouPageConfig,
  SovendusThankYouPageStatus,
  VoucherNetworkLanguage,
  VoucherNetworkSettings,
} from "sovendus-integration-types";
import {
  CountryCodes,
  LANGUAGES_BY_COUNTRIES,
} from "sovendus-integration-types";

import { getOptimizeConfig, handleCheckoutProductsConversion } from "../utils";

interface ThankYouWindow extends Window {
  sovThankyouConfig: SovendusThankYouPageConfig;
  sovIframes: ConversionsType[];
  sovConsumer: SovConsumerType;
  sovThankyouStatus: SovendusThankYouPageStatus;
}

declare let window: ThankYouWindow;

async function sovendusThankYou(): Promise<void> {
  const config = window.sovThankyouConfig;
  window.sovThankyouStatus = {
    loadedOptimize: false,
    loadedVoucherNetwork: false,
    executedCheckoutProducts: false,
    sovThankyouConfigFound: false,
    countryCodePassedOnByPlugin: false,
  };
  if (!config) {
    window.sovThankyouStatus.sovThankyouConfigFound = false;
    // eslint-disable-next-line no-console
    console.error("sovThankyouConfig is not defined");
    return;
  }
  window.sovThankyouStatus.sovThankyouConfigFound = true;
  // using string literal "UK" intentionally despite type mismatch as some systems might return UK instead of GB
  if (config.consumerCountry === "UK") {
    config.consumerCountry = CountryCodes.GB;
  }
  const { optimizeId, checkoutProducts, voucherNetwork } = getSovendusConfig(
    config.settings,
    config.consumerCountry,
    config.consumerLanguage,
  );
  handleVoucherNetwork(voucherNetwork, config, config.consumerCountry);
  window.sovThankyouStatus.executedCheckoutProducts =
    await handleCheckoutProductsConversion(
      checkoutProducts,
      getCookie,
      setCookie,
    );
  handleOptimizeConversion(optimizeId, config);
}

function handleOptimizeConversion(
  optimizeId: string | undefined,
  config: SovendusThankYouPageConfig,
): void {
  if (optimizeId) {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = `https://www.sovopt.com/${optimizeId}/conversion/?ordervalue=${
      config.orderValue
    }&ordernumber=${config.orderId}&vouchercode=${
      config.usedCouponCodes?.[0]
    }&email=${config.consumerEmail}`;
    document.body.appendChild(script);
    window.sovThankyouStatus.loadedOptimize = true;
  }
}

function handleVoucherNetwork(
  voucherNetworkConfig: VoucherNetworkLanguage | undefined,
  config: SovendusThankYouPageConfig,
  country: CountryCodes,
): void {
  if (
    voucherNetworkConfig?.trafficSourceNumber &&
    voucherNetworkConfig.trafficMediumNumber
  ) {
    window.sovIframes = window.sovIframes || [];
    window.sovIframes.push({
      trafficSourceNumber: voucherNetworkConfig.trafficSourceNumber,
      trafficMediumNumber: voucherNetworkConfig.trafficMediumNumber,
      sessionId: config.sessionId,
      timestamp: config.timestamp,
      orderId: config.orderId,
      orderValue: config.orderValue,
      orderCurrency: config.orderCurrency,
      usedCouponCode: config.usedCouponCodes?.[0],
      iframeContainerId: config.iframeContainerId,
      integrationType: config.integrationType,
    });
    window.sovConsumer = {
      consumerFirstName: config.consumerFirstName,
      consumerLastName: config.consumerLastName,
      consumerEmail: config.consumerEmail,
      consumerStreet: config.consumerStreet,
      consumerStreetNumber: config.consumerStreetNumber,
      consumerZipcode: config.consumerZipcode,
      consumerCity: config.consumerCity,
      consumerCountry: country,
      consumerPhone: config.consumerPhone,
    };

    const sovendusDiv = document.createElement("div");
    sovendusDiv.id = "sovendus-integration-container";
    const rootElement =
      config.settings.voucherNetwork.iframeContainerId &&
      document.querySelector(config.settings.voucherNetwork.iframeContainerId);
    if (rootElement) {
      rootElement.appendChild(sovendusDiv);
    } else {
      document.body.appendChild(sovendusDiv);
    }

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = "https://api.sovendus.com/sovabo/common/js/flexibleIframe.js";
    document.body.appendChild(script);
    window.sovThankyouStatus.loadedVoucherNetwork = true;
  }
}

const getCookie = (name: string): string | undefined => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift();
  }
  return undefined;
};

const setCookie = (name: string): string => {
  // only capable clearing a cookie
  const path = "/";
  const domain = window.location.hostname;
  const cookieString = `${name}=;secure;samesite=strict;max-age=Thu, 01 Jan 1970 00:00:00 UTC;domain=${domain};path=${path}`;
  document.cookie = cookieString;
  return "";
};

interface ParsedThankYouPageConfig {
  optimizeId: string | undefined;
  voucherNetwork: VoucherNetworkLanguage | undefined;
  checkoutProducts: boolean;
}

function getSovendusConfig(
  settings: SovendusAppSettings,
  country: CountryCodes,
  language: LanguageCodes | undefined,
): ParsedThankYouPageConfig {
  return {
    optimizeId: getOptimizeConfig(settings.optimize, country),
    voucherNetwork: getVoucherNetworkConfig(
      settings.voucherNetwork,
      country,
      language,
    ),
    checkoutProducts: settings.checkoutProducts,
  };
}

function getVoucherNetworkConfig(
  settings: VoucherNetworkSettings,
  country: CountryCodes | undefined,
  language: LanguageCodes | undefined,
): VoucherNetworkLanguage | undefined {
  const languageSettings = getLanguageSettings(settings, country, language);
  if (
    !languageSettings ||
    !languageSettings.isEnabled ||
    !languageSettings.trafficMediumNumber ||
    !languageSettings.trafficSourceNumber
  ) {
    return undefined;
  }
  return languageSettings;
}

function getLanguageSettings(
  settings: VoucherNetworkSettings,
  country: CountryCodes | undefined,
  language: LanguageCodes | undefined,
): VoucherNetworkLanguage | undefined {
  if (!country) {
    window.sovThankyouStatus.countryCodePassedOnByPlugin = false;
    return undefined;
  }
  window.sovThankyouStatus.countryCodePassedOnByPlugin = true;
  const countrySettings = settings.countries?.[country];
  const languagesSettings = countrySettings?.languages;
  if (!languagesSettings) {
    return undefined;
  }
  const languagesAvailable = Object.keys(LANGUAGES_BY_COUNTRIES[country]);
  if (languagesAvailable?.length === 1) {
    const language = languagesAvailable[0] as LanguageCodes;
    const languageSettings = languagesSettings[language];
    return languageSettings;
  }
  if (languagesAvailable?.length > 1) {
    const languageKey = language || detectLanguageCode();
    const languageSettings = languagesSettings[languageKey];
    if (!languageSettings) {
      return undefined;
    }
    return languageSettings;
  }
  return undefined;
}

function detectLanguageCode(): LanguageCodes {
  const htmlLang = document.documentElement.lang.split("-")[0];
  if (htmlLang) {
    return htmlLang as LanguageCodes;
  }
  return navigator.language.split("-")[0] as LanguageCodes;
}

void sovendusThankYou();
