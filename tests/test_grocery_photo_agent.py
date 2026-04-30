from scripts.grocery_photo_agent import (
    build_search_terms,
    normalize_item,
    score_candidate,
    slugify_item,
    upsert_manifest_entry,
)


def test_normalize_item_lowercases_and_trims():
    assert normalize_item('  Whole Milk  ') == 'whole milk'


def test_slugify_item_makes_file_safe_slug():
    assert slugify_item('2% Milk / Half & Half') == '2-milk-half-half'


def test_build_search_terms_prioritizes_grocery_specific_queries():
    assert build_search_terms('bananas')[:3] == [
        'bananas food',
        'bananas grocery store',
        'banana fruit',
    ]


def test_upsert_manifest_entry_merges_by_normalized_item_key():
    manifest = {}
    upsert_manifest_entry(
        manifest,
        ' Whole Milk ',
        {
            'src': 'assets/photos/whole-milk.jpg',
            'source': 'wikimedia',
            'title': 'Milk bottle',
        },
    )

    assert manifest == {
        'whole milk': {
            'src': 'assets/photos/whole-milk.jpg',
            'source': 'wikimedia',
            'title': 'Milk bottle',
        }
    }


def test_score_candidate_prefers_actual_item_title_over_storefront_noise():
    item = 'bananas'
    good = score_candidate(item, 'File:Bananas on black background 02.jpg')
    bad = score_candidate(item, "File:StateLibQld 1 116532 George Walker's Bay View Grocery Store, Shorncliffe, 1880.jpg")

    assert good > bad


def test_score_candidate_penalizes_building_and_store_results_for_milk():
    item = 'milk'
    aisle = score_candidate(item, 'File:Whole milk aisle (17132962560).jpg')
    building = score_candidate(item, 'File:Milk Bottle Building 2.jpg')

    assert aisle > building


def test_score_candidate_prefers_spinach_leaves_over_farm_harvest_group_photo():
    item = 'spinach'
    leaves = score_candidate(item, 'File:Fresh Spinach leaves.jpg')
    farm = score_candidate(item, 'File:Fresh Spinach and Kale harvest at the farm.jpg')

    assert leaves > farm


def test_score_candidate_prefers_raw_spinach_leaves_over_cooked_dish():
    item = 'spinach'
    leaves = score_candidate(item, 'File:Spinach leaves.jpg')
    cooked = score_candidate(item, 'File:A pot of cut spinach leaves with carrots and onions.jpg')

    assert leaves > cooked
