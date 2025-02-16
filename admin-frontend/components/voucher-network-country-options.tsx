import type { Dispatch, JSX, SetStateAction } from "react";
import React from "react";
import type {
  CountryCodes,
  LanguageCodes,
  SovendusAppSettings,
  VoucherNetworkLanguage,
  VoucherNetworkSettings,
} from "sovendus-integration-types";
import { LANGUAGES_BY_COUNTRIES } from "sovendus-integration-types";

import { cn } from "../lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

type CountryOptionsProps = {
  currentSettings: VoucherNetworkSettings;
  setCurrentSettings: Dispatch<SetStateAction<SovendusAppSettings>>;
  countryCodes: CountryCodes[];
};

export function CountryOptions({
  currentSettings,
  setCurrentSettings,
  countryCodes,
}: CountryOptionsProps): JSX.Element {
  const getCountryStatus = (
    countryKey: CountryCodes,
    languageKey: LanguageCodes,
  ): string => {
    const country =
      currentSettings.countries[countryKey]?.languages[languageKey];
    if (!country?.trafficMediumNumber || !country?.trafficSourceNumber) {
      return "Not configured";
    }
    if (!country.isEnabled) {
      return "Disabled";
    }
    return `Source: ${country.trafficSourceNumber}, Medium: ${country.trafficMediumNumber}`;
  };

  const isCountryEnabled = (
    country: VoucherNetworkLanguage | undefined,
  ): boolean => {
    return (
      (country?.isEnabled &&
        country.trafficSourceNumber &&
        /^\d+$/.test(country.trafficSourceNumber) &&
        country.trafficMediumNumber &&
        /^\d+$/.test(country.trafficMediumNumber)) ||
      false
    );
  };
  const handleEnabledChange = (
    countryKey: CountryCodes,
    languageKey: LanguageCodes,
    checked: boolean,
  ): void => {
    setCurrentSettings((prevState) => {
      const element =
        prevState.voucherNetwork.countries[countryKey]?.languages?.[
          languageKey
        ];
      if (
        element?.trafficMediumNumber &&
        element?.trafficSourceNumber &&
        checked !== element.isEnabled
      ) {
        const newState = {
          ...prevState,
          voucherNetwork: {
            ...prevState.voucherNetwork,
            countries: {
              ...prevState.voucherNetwork.countries,
              [countryKey]: {
                ...prevState.voucherNetwork.countries[countryKey],
                languages: {
                  ...prevState.voucherNetwork.countries[countryKey]?.languages,
                  [languageKey]: {
                    ...element,
                    isEnabled:
                      element.trafficMediumNumber &&
                      element.trafficSourceNumber &&
                      checked,
                  },
                },
              },
            },
          },
        } as SovendusAppSettings;
        return newState;
      }
      return prevState;
    });
  };
  const handleIdChange = (
    countryKey: CountryCodes,
    languageKey: LanguageCodes,
    field: "trafficSourceNumber" | "trafficMediumNumber",
    value: string,
  ): void => {
    setCurrentSettings((prevState) => {
      const newValue = String(parseInt(`${value}`, 10));
      const element =
        prevState.voucherNetwork.countries[countryKey]?.languages?.[
          languageKey
        ];
      if (element?.[field] !== newValue) {
        const newState = {
          ...prevState,
          voucherNetwork: {
            ...prevState.voucherNetwork,
            countries: {
              ...prevState.voucherNetwork.countries,
              [countryKey]: {
                ...prevState.voucherNetwork.countries[countryKey],
                languages: {
                  ...prevState.voucherNetwork.countries[countryKey]?.languages,
                  [languageKey]: {
                    ...element,
                    [field]: newValue,
                    isEnabled:
                      (field === "trafficSourceNumber"
                        ? !isNaN(Number(element?.trafficMediumNumber))
                        : !isNaN(Number(element?.trafficSourceNumber))) &&
                      !isNaN(Number(newValue)),
                  },
                },
              },
            },
          },
        };
        return newState;
      }
      return prevState;
    });
  };
  return (
    <Accordion type="single" collapsible className={cn("w-full")}>
      {countryCodes.map((countryKey) =>
        Object.entries(LANGUAGES_BY_COUNTRIES[countryKey]).map(
          ([languageKey, countryName]) => (
            <CountrySettings
              key={`${countryKey}-${languageKey}`}
              countryKey={countryKey}
              languageKey={languageKey as LanguageCodes}
              countryName={countryName}
              currentSettings={currentSettings}
              getCountryStatus={getCountryStatus}
              isCountryEnabled={isCountryEnabled}
              handleEnabledChange={handleEnabledChange}
              handleIdChange={handleIdChange}
            />
          ),
        ),
      )}
    </Accordion>
  );
}

function CountrySettings({
  countryName,
  currentSettings,
  countryKey,
  languageKey,
  getCountryStatus,
  isCountryEnabled,
  handleEnabledChange,
  handleIdChange,
}: {
  countryKey: CountryCodes;
  languageKey: LanguageCodes;
  countryName: string;
  currentSettings: VoucherNetworkSettings;
  getCountryStatus: (
    countryKey: CountryCodes,
    languageKey: LanguageCodes,
  ) => string;
  isCountryEnabled: (language: VoucherNetworkLanguage | undefined) => boolean;
  handleEnabledChange: (
    countryKey: CountryCodes,
    languageKey: LanguageCodes,
    checked: boolean,
  ) => void;
  handleIdChange: (
    countryKey: CountryCodes,
    languageKey: LanguageCodes,
    field: "trafficSourceNumber" | "trafficMediumNumber",
    value: string,
  ) => void;
}): JSX.Element {
  const currentElement =
    currentSettings.countries[countryKey]?.languages[languageKey];
  const isEnabled = isCountryEnabled(currentElement);
  const trafficSourceNumber = parseInt(
    currentElement?.trafficSourceNumber || "",
  );
  const trafficMediumNumber = parseInt(
    currentElement?.trafficMediumNumber || "",
  );
  return (
    <AccordionItem value={countryKey} key={countryKey}>
      <AccordionTrigger>
        <div className={cn("flex items-center justify-between w-full")}>
          <span>{countryName}</span>
          <div className={cn("flex items-center space-x-2")}>
            <span className={cn("text-sm text-muted-foreground")}>
              {getCountryStatus(countryKey, languageKey)}
            </span>
            {isEnabled && (
              <Badge
                variant={"default"}
                className={cn(
                  "ml-2",
                  "bg-green-100 text-green-800 hover:bg-green-100",
                )}
              >
                Enabled
              </Badge>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className={cn("space-y-4 mx-1")}>
          <div className={cn("flex items-center space-x-2")}>
            <Switch
              id={`${countryKey}-enabled`}
              checked={isEnabled}
              onCheckedChange={(checked): void =>
                handleEnabledChange(countryKey, languageKey, checked)
              }
            />
            <label htmlFor={`${countryKey}-enabled`}>
              Enable for {countryName}
            </label>
          </div>
          <div className={cn("grid grid-cols-2 gap-4")}>
            <div className={cn("space-y-2")}>
              <Label htmlFor={`${countryKey}-source`}>
                Traffic Source Number
              </Label>
              <Input
                id={`${countryKey}-source`}
                value={
                  isNaN(trafficSourceNumber) ? undefined : trafficSourceNumber
                }
                onChange={(e): void =>
                  handleIdChange(
                    countryKey,
                    languageKey,
                    "trafficSourceNumber",
                    e.target.value,
                  )
                }
                placeholder="Enter Traffic Source Number"
              />
            </div>
            <div className={cn("space-y-2")}>
              <Label htmlFor={`${countryKey}-medium`}>
                Traffic Medium Number
              </Label>
              <Input
                id={`${countryKey}-medium`}
                value={
                  isNaN(trafficMediumNumber) ? undefined : trafficMediumNumber
                }
                onChange={(e): void =>
                  handleIdChange(
                    countryKey,
                    languageKey,
                    "trafficMediumNumber",
                    e.target.value,
                  )
                }
                placeholder="Enter Traffic Medium Number"
              />
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
