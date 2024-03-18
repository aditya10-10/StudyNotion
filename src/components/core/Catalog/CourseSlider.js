import React from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import Course_Card from './Course_Card';

const CourseSlider = ({ Courses }) => {
  const settings = {
    dots: true,
    infinite: true,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
          infinite: true,
          dots: true,
        },
      },
    ],
  };

  return (
    <div className="max-h-[30rem]">
      {Courses?.length ? (
        <Slider {...settings}>
          {Courses.map((course, i) => (
            <div key={i}>
              <Course_Card course={course} Height={'h-[250px]'} />
            </div>
          ))}
        </Slider>
      ) : (
        <p className="text-xl text-richblack-5">No Course Found</p>
      )}
    </div>
  );
};

export default CourseSlider;
