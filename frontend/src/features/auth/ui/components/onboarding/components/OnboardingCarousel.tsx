import React, { RefObject } from "react";
import { FlatList, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { ONBOARDING_SLIDES } from "../constants/onboarding.constants";
import { OnboardingSlideItem } from "./OnboardingSlideItem";

type Props = {
  slidesRef: RefObject<FlatList | null>;
  onCarouselScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

export const OnboardingCarousel = ({ slidesRef, onCarouselScroll }: Props) => {
  return (
    <FlatList
      key="onboarding-slides"
      ref={slidesRef}
      data={[...ONBOARDING_SLIDES]}
      renderItem={({ index }) => <OnboardingSlideItem index={index} />}
      keyExtractor={(item) => item.id.toString()}
      horizontal
      pagingEnabled
      bounces={false}
      decelerationRate="fast"
      showsHorizontalScrollIndicator={false}
      onScroll={onCarouselScroll}
      onMomentumScrollEnd={onCarouselScroll}
      scrollEventThrottle={16}
    />
  );
};
