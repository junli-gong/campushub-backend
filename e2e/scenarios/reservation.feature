Feature: Reserve a campus resource
  As a student, I want to book an available resource and know if someone else has the slot.

  Scenario: A student books an available study room
    Given a student is on the CampusHub home page with no active bookings
    When they filter the resource directory to "Study rooms"
    And they select "Study Room 302" and reserve a free one-hour slot tomorrow
    Then they see "Reservation created. You can find it in My Bookings."
    And after reopening the page as that student, "My Bookings" shows one "PENDING" booking for "Study Room 302" at the requested time

  Scenario: A second student tries to book an occupied printer
    Given a student has booked "3D Printer A" for a one-hour slot tomorrow
    When a different student tries to book "3D Printer A" for exactly the same slot
    Then they see "This resource is already reserved for the selected time window. Please choose another time."
    And the second student has no booking for that request
    And the first student's original booking is still active
