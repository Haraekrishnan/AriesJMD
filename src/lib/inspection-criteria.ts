export const HARNESS_INSPECTION_CRITERIA = [
  {
    id: 'preliminaryObservation',
    label: 'Preliminary Observation',
    points: [
      'Verify the presence and legibility of the serial number and CE mark / ARIES ID',
      'Verify that the product lifetime has not been exceeded.',
      'Compare with a new product to verify there are no modifications or missing parts',
    ],
  },
  {
    id: 'straps',
    label: 'Checking the condition of the straps',
    points: [
      'Check for cuts, swelling, damage and wear due to use, to heat, and to contact with chemicals. Check the waist belt straps, leg loops, leg loop/waist belt linkage and shoulder straps, if present. Be sure to check the areas hidden by the buckles.',
      'Check the condition of the safety stitching on both sides. Look for any threads that are loose, worn, or cut. The safety stitching is identified by thread of a different colour than that of the webbing.',
      'Verify that hems are present on the strap ends.',
    ],
  },
  {
    id: 'attachmentPoints',
    label: 'Checking the attachment points',
    points: [
      'Check the condition of the metal attachment points (marks, cracks, wear, deformation, corrosion...).',
      'Check the condition of the textile attachment points (cuts, wear, tears...).',
      'Check the condition of the plastic attachment buckles (marks, cracks, wear, deformation, corrosion.)',
      'On the multi standard NAVAHO and AVAO harness, check the fall arrest indicator. Th indicator shows red if the dorsal attachment point sustains a shock load greater than 400DaN.',
    ],
  },
  {
    id: 'adjustmentBuckles',
    label: 'Checking the condition of the adjustment buckles',
    points: [
      'Check the condition of the DOUBLEBACK adjustment buckles (marks, cracks, wear, deformation, corrosion...).',
      'Check the condition of the FAST adjustment buckles (marks, cracks, wear, deformation, corrosion...).',
      'Check that the straps are correctly threaded, with no twists.',
      'Verify that the buckles operate properly.',
    ],
  },
  {
    id: 'comfortParts',
    label: 'Checking the condition of the comfort parts',
    points: [
      'Check the condition of the waist, leg and shoulder foams (cuts, wear, tears...).',
      'Check the condition of the elastic and/or plastic keepers (cuts, wear, tears...).',
      'Check the condition of the leg loop elastics (cuts, wear, tears...).',
      'Check the condition of the equipment loops (cuts, wear, tears...).',
    ],
  },
  {
    id: 'harnessConnector',
    label: 'Checking the condition of the chest/seat harness connector (if any)',
    points: [
      'If the harness features a chest/seat harness connector, make sure that it is present.',
      'Verify that the connector is the correct model and that it is correctly attached to the harness.',
      'Gated attachment point: verify that the screws on the gated attachment point are present and properly tightened',
    ],
  },
  {
    id: 'crollClamp',
    label: 'Checking the condition of the CROLL rope clamp (if any)',
    points: [],
  },
  {
    id: 'frame',
    label: 'Checking the condition of the frame',
    points: [
      'Check the condition of the frame (marks, wear, cracks, deformation, corrosion...).',
      'Check the condition of the attachment holes (marks, deformation, cracks, corrosion...).',
      'Check for wear caused by rope running through the device.',
      'For CROLLs manufactured after February 2017, check that the wear indicator is not visible.',
    ],
  },
  {
    id: 'cam',
    label: 'Checking the cam',
    points: [
      'Check the condition of the cam (marks, deformation, cracks, and corrosion).',
      'Check that all teeth are present and check their state of wear. The teeth must not be fouled. If necessary, clean them with a brush.',
      'Check the condition of the cam axle and rivet (marks, deformation, cracks, corrosion...).',
      "Check the cam's rotation and the effectiveness of the return spring.",
    ],
  },
  {
    id: 'safetyCatch',
    label: 'Checking the safety catch',
    points: [
      'Check the condition of the safety catch and its axle (marks, deformation, cracks, corrosion...)',
      'Check the effectiveness of the safety catch return spring.',
      'Verify that the safety catch is able to hold the cam open.',
    ],
  },
  {
    id: 'functionCheck',
    label: 'Function check',
    points: ['Verify that the rope clamp slides along the rope in one direction and locks in the other direction.'],
  },
];
